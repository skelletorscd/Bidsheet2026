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
};

export function useSession(): SessionState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(SUPABASE_CONFIGURED);

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

    const { data: sub } = sb.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !user) {
      setProfile(null);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await sb
        .from("profiles")
        .select("id, display_name, photo_url, is_admin, claimed_driver_rank")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.error("profile load error", error);
        setProfile(null);
      } else {
        setProfile(data as Profile | null);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return { user, profile, loading, configured: SUPABASE_CONFIGURED };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}
