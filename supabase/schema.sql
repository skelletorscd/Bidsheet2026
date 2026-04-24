-- Toledo Feeder Bids · Supabase schema for Phase B + C
--
-- To install: open Supabase → SQL Editor → paste this entire file → Run.
-- Safe to re-run; every CREATE uses IF NOT EXISTS or CREATE OR REPLACE.
-- Run AGAIN whenever this file changes.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. profiles  ── one row per authenticated user, keyed to auth.users.id
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  photo_url text,
  -- Set to TRUE only by an existing admin (see policies below).
  is_admin boolean not null default false,
  -- FK to roster_driver.rank once their identity claim is approved.
  -- NULL until approval.
  claimed_driver_rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_claimed_driver_rank_idx
  on public.profiles (claimed_driver_rank);

-- Auto-create a blank profile row every time someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bump updated_at on every row change.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. name_claims  ── user says "I'm driver #214, here's proof"
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.name_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  driver_rank integer not null,
  driver_name text not null,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists name_claims_status_idx on public.name_claims (status);
create index if not exists name_claims_user_idx on public.name_claims (user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. driver_status  ── the live on-call board (Phase C wiring)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.driver_status (
  driver_rank integer primary key,
  status text not null default 'available'
    check (status in (
      'available', 'hold', 'pass', 'called_off',
      'working', 'reset', 'limbo'
    )),
  hold_count integer not null default 0,
  punch_in_at timestamptz,
  punch_out_at timestamptz,
  auto_punched boolean not null default false,
  current_job_num text,
  current_job_kind text,  -- 'bid' | 'shift' | 'new'
  notes text,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

drop trigger if exists driver_status_updated_at on public.driver_status;
create trigger driver_status_updated_at before update on public.driver_status
  for each row execute function public.touch_updated_at();

-- Audit log so we can see history of status changes per driver.
create table if not exists public.driver_status_events (
  id bigserial primary key,
  driver_rank integer not null,
  event text not null,   -- 'pass' | 'hold' | 'call_off' | 'punch_in' | ...
  details jsonb,
  actor uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists driver_status_events_rank_idx
  on public.driver_status_events (driver_rank, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────

-- Helper: is the caller an admin?
create or replace function public.is_admin(u uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = u),
    false
  );
$$;

alter table public.profiles enable row level security;
alter table public.name_claims enable row level security;
alter table public.driver_status enable row level security;
alter table public.driver_status_events enable row level security;

-- profiles: everyone can read (coworkers need to see names + photos);
-- only the owner can update their own profile; admins can update anyone.
drop policy if exists "profiles read all" on public.profiles;
create policy "profiles read all" on public.profiles
  for select using (true);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
  for update using (public.is_admin(auth.uid()))
             with check (public.is_admin(auth.uid()));

-- name_claims: users can see + create their own; admins see all + update.
drop policy if exists "claims self read" on public.name_claims;
create policy "claims self read" on public.name_claims
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "claims self insert" on public.name_claims;
create policy "claims self insert" on public.name_claims
  for insert with check (auth.uid() = user_id);

drop policy if exists "claims admin decide" on public.name_claims;
create policy "claims admin decide" on public.name_claims
  for update using (public.is_admin(auth.uid()))
             with check (public.is_admin(auth.uid()));

-- driver_status: everyone can read (board is public).
-- A user can update THEIR OWN row (the one matching their claimed rank).
-- Admins can update any row.
drop policy if exists "status read all" on public.driver_status;
create policy "status read all" on public.driver_status
  for select using (true);

drop policy if exists "status self update" on public.driver_status;
create policy "status self update" on public.driver_status
  for update using (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.claimed_driver_rank = driver_status.driver_rank
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.claimed_driver_rank = driver_status.driver_rank
    )
  );

drop policy if exists "status self upsert" on public.driver_status;
create policy "status self upsert" on public.driver_status
  for insert with check (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.claimed_driver_rank = driver_status.driver_rank
    )
  );

drop policy if exists "status admin all" on public.driver_status;
create policy "status admin all" on public.driver_status
  for all using (public.is_admin(auth.uid()))
          with check (public.is_admin(auth.uid()));

-- status events: readable by everyone, insert only by owner or admin.
drop policy if exists "events read all" on public.driver_status_events;
create policy "events read all" on public.driver_status_events
  for select using (true);

drop policy if exists "events insert self or admin" on public.driver_status_events;
create policy "events insert self or admin" on public.driver_status_events
  for insert with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.claimed_driver_rank = driver_status_events.driver_rank
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Storage bucket for profile photos
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('profile-photos', 'profile-photos', true)
  on conflict (id) do nothing;

drop policy if exists "photos read all" on storage.objects;
create policy "photos read all" on storage.objects
  for select using (bucket_id = 'profile-photos');

drop policy if exists "photos own write" on storage.objects;
create policy "photos own write" on storage.objects
  for insert with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos own update" on storage.objects;
create policy "photos own update" on storage.objects
  for update using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos own delete" on storage.objects;
create policy "photos own delete" on storage.objects
  for delete using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Bootstrap: mark Samuel as the first admin
--     Replace the email below if needed. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────
-- Example (run AFTER you sign up once with this email):
--   update public.profiles
--      set is_admin = true
--    where id = (select id from auth.users where email = 'Devossam1@hotmail.com');
