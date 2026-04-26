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
  -- Pay rates (dollars). NULL until the driver fills them in.
  hourly_rate numeric(6, 2),
  mileage_rate numeric(6, 3),
  -- Set to now() when the driver clocks in; null when clocked out.
  -- Client computes elapsed time + earnings client-side from this anchor.
  clocked_in_at timestamptz,
  -- Opt-in: receive browser notifications for 10-hr / 14-hr cutoffs.
  alerts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill for existing profiles (safe to re-run).
-- These columns may exist if you ran an earlier version of this schema;
-- they get dropped after the data is moved into driver_payclock below.
alter table public.profiles
  add column if not exists hourly_rate numeric(6, 2);
alter table public.profiles
  add column if not exists mileage_rate numeric(6, 3);
alter table public.profiles
  add column if not exists clocked_in_at timestamptz;
alter table public.profiles
  add column if not exists alerts_enabled boolean not null default false;

-- ─────────────────────────────────────────────────────────────────────────
-- 1b. driver_payclock  ── PRIVATE per-user pay/clock state.
--     Lives in its own table because public.profiles is readable by every
--     authenticated user (so coworkers can see names/photos), and we
--     don't want hourly rates or punch-in timestamps exposed.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.driver_payclock (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hourly_rate numeric(6, 2),
  mileage_rate numeric(6, 3),
  clocked_in_at timestamptz,
  alerts_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists driver_payclock_updated_at on public.driver_payclock;
create trigger driver_payclock_updated_at before update on public.driver_payclock
  for each row execute function public.touch_updated_at();

-- One-time data migration from the old profile columns. Idempotent: if
-- rows already exist in driver_payclock the COPY is skipped.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'hourly_rate'
  ) then
    insert into public.driver_payclock (
      user_id, hourly_rate, mileage_rate, clocked_in_at, alerts_enabled
    )
    select id, hourly_rate, mileage_rate, clocked_in_at, alerts_enabled
      from public.profiles
     where hourly_rate is not null
        or mileage_rate is not null
        or clocked_in_at is not null
        or alerts_enabled is true
    on conflict (user_id) do nothing;
  end if;
end $$;

-- Now drop the columns off profiles so they can never be read by another
-- user via the public RLS policy.
alter table public.profiles drop column if exists hourly_rate;
alter table public.profiles drop column if exists mileage_rate;
alter table public.profiles drop column if exists clocked_in_at;
alter table public.profiles drop column if exists alerts_enabled;

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
-- 3b. shift_history  ── one row per completed shift, used by the Pay Clock
--     to show today/this-week/past-weeks earnings.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.shift_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  driver_rank integer,
  bid_job_num text,
  bid_hub text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  hours_worked numeric(6, 3) not null,
  hourly_rate_used numeric(6, 2) not null,
  earnings numeric(8, 2) not null,
  was_auto_punched boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists shift_history_user_started_idx
  on public.shift_history (user_id, started_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- 3c. bid_change_requests  ── driver asks admin to update what bid is
--     attached to their account (e.g. they dropped off TN01 and picked
--     up COL2). Admin reviews in the Account-page admin panel.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.bid_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  driver_rank integer,
  current_job_num text,
  current_hub text,
  new_job_num text,
  new_hub text,
  is_drop_off boolean not null default false,
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now()
);

create index if not exists bid_change_requests_status_idx
  on public.bid_change_requests (status);
create index if not exists bid_change_requests_user_idx
  on public.bid_change_requests (user_id);

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
alter table public.shift_history enable row level security;
alter table public.driver_payclock enable row level security;
alter table public.bid_change_requests enable row level security;

-- bid_change_requests: drivers can read/insert their own; admins read all + decide.
drop policy if exists "bid req self read" on public.bid_change_requests;
create policy "bid req self read" on public.bid_change_requests
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "bid req self insert" on public.bid_change_requests;
create policy "bid req self insert" on public.bid_change_requests
  for insert with check (auth.uid() = user_id);

drop policy if exists "bid req admin decide" on public.bid_change_requests;
create policy "bid req admin decide" on public.bid_change_requests
  for update using (public.is_admin(auth.uid()))
             with check (public.is_admin(auth.uid()));

drop policy if exists "bid req self cancel" on public.bid_change_requests;
create policy "bid req self cancel" on public.bid_change_requests
  for delete using (auth.uid() = user_id and status = 'pending');

-- driver_payclock: only the owner can read/write; admins can read all.
drop policy if exists "payclock self read" on public.driver_payclock;
create policy "payclock self read" on public.driver_payclock
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "payclock self upsert" on public.driver_payclock;
create policy "payclock self upsert" on public.driver_payclock
  for insert with check (auth.uid() = user_id);

drop policy if exists "payclock self update" on public.driver_payclock;
create policy "payclock self update" on public.driver_payclock
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "payclock self delete" on public.driver_payclock;
create policy "payclock self delete" on public.driver_payclock
  for delete using (auth.uid() = user_id);

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

-- shift_history: a user can read + insert their own; admin sees all.
drop policy if exists "shift read self" on public.shift_history;
create policy "shift read self" on public.shift_history
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "shift insert self" on public.shift_history;
create policy "shift insert self" on public.shift_history
  for insert with check (auth.uid() = user_id);

drop policy if exists "shift update self" on public.shift_history;
create policy "shift update self" on public.shift_history
  for update using (auth.uid() = user_id or public.is_admin(auth.uid()))
             with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "shift delete self" on public.shift_history;
create policy "shift delete self" on public.shift_history
  for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));

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
-- 6. Realtime replication — pushes row-change events to the client so
--    the UI (admin panel, claim status, profile) refreshes automatically
--    when someone else updates something. RLS still applies, so users
--    only receive events for rows they're allowed to read.
-- ─────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.profiles;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.name_claims;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.driver_status;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.driver_status_events;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.shift_history;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.driver_payclock;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.bid_change_requests;
    exception when duplicate_object then null; end;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Bootstrap: mark Samuel as the first admin
--     Replace the email below if needed. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────
-- Example (run AFTER you sign up once with this email):
--   update public.profiles
--      set is_admin = true
--    where id = (select id from auth.users where email = 'Devossam1@hotmail.com');
