import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  Loader2,
  LogOut,
  Save,
  Shield,
  UserCircle,
  X,
} from "lucide-react";
import { getSupabase, SUPABASE_CONFIGURED } from "../data/supabase";
import { Profile, signOut, useSession } from "../data/useSession";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ROSTER } from "../data/roster";
import { namesMatch, normalizeName } from "../parse/names";

type Props = {
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
  onOpenAuth: () => void;
};

export function AccountView({ onStatus, onOpenAuth }: Props) {
  const session = useSession();

  useEffect(() => {
    onStatus({
      fetchedAt: Date.now(),
      loading: session.loading,
      error: null,
      source: "supabase",
    });
  }, [onStatus, session.loading]);

  if (!SUPABASE_CONFIGURED) {
    return <NotConfigured />;
  }
  if (session.loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
      </div>
    );
  }
  if (!session.user) {
    return <SignedOut onOpenAuth={onOpenAuth} />;
  }
  return <SignedIn profile={session.profile} userId={session.user.id} email={session.user.email ?? ""} />;
}

// ─── Signed-out landing ────────────────────────────────────────────────

function SignedOut({ onOpenAuth }: { onOpenAuth: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 sm:p-10 text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 items-center justify-center mb-4">
          <UserCircle className="w-8 h-8 text-amber-300" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
          Drivers — claim your spot
        </h1>
        <p className="text-slate-400 mt-2 leading-relaxed">
          Create an account to get a profile page, claim the seniority
          rank that's yours, and soon be able to update your own on-call
          status straight from your phone.
        </p>
        <button
          onClick={onOpenAuth}
          className="btn btn-primary mt-5 px-5 py-2.5 text-base"
        >
          Sign in / Create account
        </button>
        <p className="text-[11px] text-slate-500 mt-4">
          Your name-claim still needs Samuel's approval before you can
          touch the on-call board.
        </p>
      </div>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 sm:p-10">
        <div className="card p-5 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold">Accounts not set up yet</h3>
          </div>
          <p className="text-sm text-slate-400">
            Supabase credentials aren't configured on this build. Samuel
            needs to add them before anyone can sign in.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Signed-in editor ──────────────────────────────────────────────────

function SignedIn({
  profile,
  userId,
  email,
}: {
  profile: Profile | null;
  userId: string;
  email: string;
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  const saveProfile = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { error: err } = await sb
      .from("profiles")
      .update({ display_name: displayName.trim() || null })
      .eq("id", userId);
    setBusy(false);
    if (err) {
      setError(err.message);
    } else {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1800);
    }
  };

  const uploadPhoto = async (file: File) => {
    const sb = getSupabase();
    if (!sb) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await sb.storage
        .from("profile-photos")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data } = sb.storage.from("profile-photos").getPublicUrl(path);
      const cacheBusted = `${data.publicUrl}?t=${Date.now()}`;
      const { error: updErr } = await sb
        .from("profiles")
        .update({ photo_url: cacheBusted })
        .eq("id", userId);
      if (updErr) throw updErr;
      window.location.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const claim = profile?.claimed_driver_rank ?? null;
  const claimedRow = useMemo(
    () => (claim != null ? ROSTER.find((r) => r.rank === claim) : null),
    [claim],
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-5">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100">
          My account
        </h1>

        {/* Avatar + identity */}
        <section className="card p-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-bg-raised border-2 border-amber-500/40 overflow-hidden flex items-center justify-center">
                {profile?.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-10 h-10 text-slate-500" />
                )}
              </div>
              <label
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-bg-base flex items-center justify-center cursor-pointer shadow-lg"
                title="Upload photo"
              >
                {photoBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadPhoto(f);
                  }}
                />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Signed in
              </div>
              <div className="text-slate-100 font-semibold truncate">
                {profile?.display_name || email}
              </div>
              <div className="text-[12px] text-slate-500 truncate">{email}</div>
              {profile?.is_admin && (
                <div className="inline-flex items-center gap-1 mt-1 text-[10px] uppercase tracking-widest font-bold text-amber-300 bg-amber-500/15 border border-amber-500/40 rounded px-2 py-0.5">
                  <Shield className="w-3 h-3" />
                  Admin
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">
                Display name
              </span>
              <input
                className="input w-full mt-1"
                placeholder="How your name shows to other drivers"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-primary"
                onClick={saveProfile}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedFlash ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savedFlash ? "Saved" : "Save"}
              </button>
              <button className="btn" onClick={() => signOut()}>
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
            {error && (
              <div className="flex items-start gap-2 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-md p-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* Claim section */}
        <ClaimSection
          userId={userId}
          claim={claim}
          claimedName={claimedRow?.name ?? null}
        />

        {/* Admin panel */}
        {profile?.is_admin && <AdminPanel />}
      </div>
    </div>
  );
}

// ─── Name-claim flow ───────────────────────────────────────────────────

function ClaimSection({
  userId,
  claim,
  claimedName,
}: {
  userId: string;
  claim: number | null;
  claimedName: string | null;
}) {
  const [pending, setPending] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rank, setRank] = useState<number | "">("");
  const [message, setMessage] = useState("");

  const reload = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    const { data, error: err } = await sb
      .from("name_claims")
      .select("id, driver_rank, driver_name, status, message, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setPending((data as PendingClaim[] | null) ?? []);
    }
  };

  useEffect(() => {
    reload();
    // Subscribe to realtime updates so approval/rejection by an admin
    // shows up without requiring a page reload.
    const sb = getSupabase();
    if (!sb) return;
    const channelKey = `claims:${userId}:${Math.random().toString(36).slice(2, 10)}`;
    const channel: RealtimeChannel = sb
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "name_claims",
          filter: `user_id=eq.${userId}`,
        },
        () => reload(),
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const submit = async () => {
    const sb = getSupabase();
    if (!sb) return;
    if (!rank || typeof rank !== "number") {
      setError("Pick your seniority rank from the list.");
      return;
    }
    const row = ROSTER.find((r) => r.rank === rank);
    if (!row) {
      setError("No driver at that rank.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await sb.from("name_claims").insert({
      user_id: userId,
      driver_rank: rank,
      driver_name: row.name,
      message: message.trim() || null,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
    } else {
      setRank("");
      setMessage("");
      reload();
    }
  };

  if (claim != null) {
    return (
      <section className="card p-5 border-emerald-500/40 bg-emerald-500/[0.04]">
        <div className="flex items-center gap-2 text-emerald-300 text-[11px] uppercase tracking-wider font-bold">
          <Check className="w-3.5 h-3.5" />
          Linked to the seniority list
        </div>
        <div className="mt-1 text-xl font-extrabold text-slate-100">
          #{claim} {claimedName}
        </div>
        <p className="text-sm text-slate-400 mt-1">
          You're the authorized account for this driver. You'll be able to
          update your own on-call status once the board opens.
        </p>
      </section>
    );
  }

  const latest = pending[0];
  const hasOpen = latest && latest.status === "pending";

  return (
    <section className="card p-5">
      <h2 className="text-[11px] uppercase tracking-[0.3em] text-slate-400 font-bold">
        Claim your driver name
      </h2>
      <p className="text-sm text-slate-400 mt-1 mb-4 leading-relaxed">
        Pick your rank from the seniority list. Samuel reviews every claim
        to make sure nobody claims someone else's spot; once approved, you
        control that row on the on-call board.
      </p>

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      ) : hasOpen ? (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/40 rounded-lg p-3">
          <Loader2 className="w-4 h-4 text-amber-300 animate-spin mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="text-amber-200 font-semibold">
              Claim pending review
            </div>
            <div className="text-slate-400 text-[12px] mt-0.5">
              You requested rank #{latest.driver_rank} {latest.driver_name}.
              Samuel will approve or reject it soon.
            </div>
          </div>
        </div>
      ) : (
        <>
          <label className="block mb-3">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">
              Your seniority rank
            </span>
            <select
              className="input w-full mt-1"
              value={rank === "" ? "" : rank}
              onChange={(e) =>
                setRank(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Pick your row on the seniority list…</option>
              {ROSTER.map((r) => (
                <option key={r.rank} value={r.rank}>
                  #{r.rank} · {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block mb-3">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">
              Note to Samuel (optional)
            </span>
            <textarea
              className="input w-full mt-1 h-20 resize-none"
              placeholder='"Hey this is me, text me if you need to verify"'
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          {error && (
            <div className="flex items-start gap-2 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-md p-2 mb-3">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            className="btn btn-primary"
            disabled={busy || !rank}
            onClick={submit}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Submit claim
          </button>
        </>
      )}

      {pending.filter((p) => p.status !== "pending").slice(0, 3).length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            Past attempts
          </div>
          <ul className="space-y-1 text-[12px]">
            {pending
              .filter((p) => p.status !== "pending")
              .slice(0, 3)
              .map((p) => (
                <li key={p.id} className="text-slate-400">
                  #{p.driver_rank} {p.driver_name} ·{" "}
                  <span
                    className={
                      p.status === "approved"
                        ? "text-emerald-300"
                        : "text-rose-300"
                    }
                  >
                    {p.status}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ─── Admin panel ───────────────────────────────────────────────────────

type PendingClaim = {
  id: string;
  user_id?: string;
  driver_rank: number;
  driver_name: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type AdminClaim = PendingClaim & {
  user_email?: string | null;
  user_id: string;
};

function AdminPanel() {
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    const { data, error: err } = await sb
      .from("name_claims")
      .select("id, user_id, driver_rank, driver_name, message, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setLoading(false);
    if (err) setError(err.message);
    else setClaims((data as AdminClaim[] | null) ?? []);
  };

  useEffect(() => {
    load();
    const sb = getSupabase();
    if (!sb) return;
    const channelKey = `admin:name_claims:${Math.random().toString(36).slice(2, 10)}`;
    const channel: RealtimeChannel = sb
      .channel(channelKey)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "name_claims" },
        () => load(),
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  const decide = async (claim: AdminClaim, approve: boolean) => {
    const sb = getSupabase();
    if (!sb) return;
    setBusyId(claim.id);
    setError(null);
    try {
      const { error: err1 } = await sb
        .from("name_claims")
        .update({
          status: approve ? "approved" : "rejected",
          decided_at: new Date().toISOString(),
        })
        .eq("id", claim.id);
      if (err1) throw err1;

      if (approve) {
        // Link the claimed rank to the requesting user's profile.
        const { error: err2 } = await sb
          .from("profiles")
          .update({ claimed_driver_rank: claim.driver_rank })
          .eq("id", claim.user_id);
        if (err2) throw err2;
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="card p-5 border-amber-500/40 bg-amber-500/[0.05]">
      <h2 className="text-[11px] uppercase tracking-[0.3em] text-amber-300 font-bold flex items-center gap-1.5">
        <Shield className="w-3 h-3" />
        Admin · pending name claims
      </h2>

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-amber-300 mt-3" />
      ) : claims.length === 0 ? (
        <p className="text-sm text-slate-400 mt-2">
          No pending claims right now.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {claims.map((c) => {
            const rosterRow = ROSTER.find((r) => r.rank === c.driver_rank);
            const nameMatch = rosterRow
              ? namesMatch(
                  normalizeName(rosterRow.name),
                  normalizeName(c.driver_name),
                )
              : false;
            return (
              <li
                key={c.id}
                className="rounded-lg border border-border bg-bg-panel p-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-slate-100 font-semibold">
                      #{c.driver_rank} {c.driver_name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Requested{" "}
                      {new Date(c.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                    {!nameMatch && rosterRow && (
                      <div className="text-[11px] text-rose-300 mt-0.5">
                        ⚠ Claimed name doesn't match roster (
                        {rosterRow.name})
                      </div>
                    )}
                    {c.message && (
                      <div className="text-[12px] text-slate-300 mt-1 italic">
                        "{c.message}"
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      className="btn"
                      disabled={busyId === c.id}
                      onClick={() => decide(c, false)}
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={busyId === c.id}
                      onClick={() => decide(c, true)}
                    >
                      {busyId === c.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <div className="flex items-start gap-2 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-md p-2 mt-3">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
