import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getSupabase, SUPABASE_CONFIGURED } from "./supabase";

export type Profile = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  is_admin: boolean;
  claimed_driver_rank: number | null;
};

export type SessionState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  /** True when the user just arrived via a password-recovery link. */
  recoveryMode: boolean;
};

async function fetchProfile(userId: string): Promise<Profile | null> {
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
  return data as Profile | null;
}

export function useSession(): SessionState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(SUPABASE_CONFIGURED);
  const [recoveryMode, setRecoveryMode] = useState(false);

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

    const channel = sb
      .channel(`profile:${user.id}`)
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
