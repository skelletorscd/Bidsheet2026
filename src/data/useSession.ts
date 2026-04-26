import { useCallback, useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getSupabase, SUPABASE_CONFIGURED } from "./supabase";

export type Profile = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  is_admin: boolean;
  claimed_driver_rank: number | null;
  hourly_rate: number | null;
  mileage_rate: number | null;
  clocked_in_at: string | null; // ISO timestamp
  alerts_enabled: boolean;
};

export type SessionState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  /** True when the user just arrived via a password-recovery link. */
  recoveryMode: boolean;
  /** Manually re-fetch the profile (use after a write completes; realtime
   *  may not be set up for some Supabase deploys). */
  refreshProfile: () => Promise<void>;
};

// Defaults for any column that might not exist yet (older schema deploys).
function withDefaults(raw: Partial<Profile> | null): Profile | null {
  if (!raw) return null;
  return {
    id: raw.id ?? "",
    display_name: raw.display_name ?? null,
    photo_url: raw.photo_url ?? null,
    is_admin: raw.is_admin ?? false,
    claimed_driver_rank: raw.claimed_driver_rank ?? null,
    hourly_rate: raw.hourly_rate ?? null,
    mileage_rate: raw.mileage_rate ?? null,
    clocked_in_at: raw.clocked_in_at ?? null,
    alerts_enabled: raw.alerts_enabled ?? false,
  };
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  // Try the full column set first.
  const FULL =
    "id, display_name, photo_url, is_admin, claimed_driver_rank, hourly_rate, mileage_rate, clocked_in_at, alerts_enabled";
  let { data, error } = await sb
    .from("profiles")
    .select(FULL)
    .eq("id", userId)
    .maybeSingle();
  // PostgREST returns 42703 when a column is missing — happens when the
  // SQL migration in supabase/schema.sql hasn't been re-run yet. Fall
  // back to the original column set so the rest of the app keeps working.
  if (error && (error as { code?: string }).code === "42703") {
    const ORIGINAL =
      "id, display_name, photo_url, is_admin, claimed_driver_rank";
    ({ data, error } = await sb
      .from("profiles")
      .select(ORIGINAL)
      .eq("id", userId)
      .maybeSingle());
  }
  if (error) {
    console.error("profile load error", error);
    return null;
  }
  return withDefaults(data as Partial<Profile> | null);
}

export function useSession(): SessionState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(SUPABASE_CONFIGURED);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  const refreshProfile = useCallback(async () => {
    const id = userIdRef.current;
    if (!id) return;
    const p = await fetchProfile(id);
    setProfile(p);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }

    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((evt, session) => {
      setUser(session?.user ?? null);
      if (evt === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile on user change AND subscribe to profile updates so an
  // admin flip (or photo change from another tab) propagates immediately.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !user) {
      setProfile(null);
      return;
    }
    let active = true;
    (async () => {
      const p = await fetchProfile(user.id);
      if (active) setProfile(p);
    })();

    // Unique channel name per mount — Supabase reuses channel instances
    // by name, and re-using a name after subscribe() throws on the next
    // .on() call (which React StrictMode triggers in dev).
    const channelKey = `profile:${user.id}:${Math.random().toString(36).slice(2, 10)}`;
    const channel = sb
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        async () => {
          const p = await fetchProfile(user.id);
          if (active) setProfile(p);
        },
      )
      .subscribe();

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [user]);

  return {
    user,
    profile,
    loading,
    configured: SUPABASE_CONFIGURED,
    recoveryMode,
    refreshProfile,
  };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export function clearRecoveryModeFlag(): void {
  // Intentional no-op — the flag lives inside the hook state; components
  // trigger their own re-render to exit the flow (App.tsx handles this).
}
