import { useCallback, useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getSupabase, SUPABASE_CONFIGURED } from "./supabase";

export type Profile = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  is_admin: boolean;
  claimed_driver_rank: number | null;
  // Sensitive fields — sourced from the private driver_payclock table.
  hourly_rate: number | null;
  mileage_rate: number | null;
  clocked_in_at: string | null;
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

type ProfilePublic = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  is_admin: boolean;
  claimed_driver_rank: number | null;
};

type PayClock = {
  hourly_rate: number | null;
  mileage_rate: number | null;
  clocked_in_at: string | null;
  alerts_enabled: boolean;
};

async function fetchProfilePublic(userId: string): Promise<ProfilePublic | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("profiles")
    .select("id, display_name, photo_url, is_admin, claimed_driver_rank")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("profile load error", error);
    return null;
  }
  return data as ProfilePublic | null;
}

async function fetchPayClock(userId: string): Promise<PayClock> {
  const sb = getSupabase();
  if (!sb) return EMPTY_PAYCLOCK;
  const { data, error } = await sb
    .from("driver_payclock")
    .select("hourly_rate, mileage_rate, clocked_in_at, alerts_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    // Fail soft: table may not exist yet (pre-migration), or no row yet.
    if (
      (error as { code?: string }).code !== "42P01" &&
      !/(does not exist|PGRST205)/i.test((error as { message?: string }).message ?? "")
    ) {
      console.error("payclock load error", error);
    }
    return EMPTY_PAYCLOCK;
  }
  if (!data) return EMPTY_PAYCLOCK;
  return {
    hourly_rate: data.hourly_rate ?? null,
    mileage_rate: data.mileage_rate ?? null,
    clocked_in_at: data.clocked_in_at ?? null,
    alerts_enabled: data.alerts_enabled ?? false,
  };
}

const EMPTY_PAYCLOCK: PayClock = {
  hourly_rate: null,
  mileage_rate: null,
  clocked_in_at: null,
  alerts_enabled: false,
};

async function fetchProfile(userId: string): Promise<Profile | null> {
  const [pub, payclock] = await Promise.all([
    fetchProfilePublic(userId),
    fetchPayClock(userId),
  ]);
  if (!pub) return null;
  return {
    id: pub.id,
    display_name: pub.display_name,
    photo_url: pub.photo_url,
    is_admin: pub.is_admin,
    claimed_driver_rank: pub.claimed_driver_rank,
    hourly_rate: payclock.hourly_rate,
    mileage_rate: payclock.mileage_rate,
    clocked_in_at: payclock.clocked_in_at,
    alerts_enabled: payclock.alerts_enabled,
  };
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

  // Fetch profile on user change AND subscribe to BOTH tables so the
  // signed-in driver sees their own data update live.
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

    const refresh = async () => {
      const p = await fetchProfile(user.id);
      if (active) setProfile(p);
    };

    const profileChannel = sb
      .channel(`profile:${user.id}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => refresh(),
      )
      .subscribe();

    const payclockChannel = sb
      .channel(`payclock:${user.id}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_payclock",
          filter: `user_id=eq.${user.id}`,
        },
        () => refresh(),
      )
      .subscribe();

    return () => {
      active = false;
      sb.removeChannel(profileChannel);
      sb.removeChannel(payclockChannel);
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
  // Intentional no-op — kept for callers that may have referenced it.
}
