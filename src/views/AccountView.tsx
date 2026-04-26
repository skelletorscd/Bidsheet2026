import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  CalendarRange,
  Camera,
  Check,
  DollarSign,
  Loader2,
  LogOut,
  Map,
  Save,
  Shield,
  Truck,
  UserCircle,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getSupabase, SUPABASE_CONFIGURED } from "../data/supabase";
import { Profile, signOut, useSession } from "../data/useSession";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ROSTER, ALL_BIDS, SnapshotBid } from "../data/roster";
import { namesMatch, normalizeName } from "../parse/names";
import { useRouteDraft } from "../data/useRouteDraft";

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

        {/* Bid assignment from seniority */}
        {claim != null && (
          <BidAssignmentSection
            userId={userId}
            driverRank={claim}
          />
        )}

        {/* Weekly earnings card */}
        <WeeklyEarnings userId={userId} />

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

// ─── Bid assignment + change-request flow ─────────────────────────────

type BidChangeRequest = {
  id: string;
  user_id: string;
  driver_rank: number | null;
  current_job_num: string | null;
  current_hub: string | null;
  new_job_num: string | null;
  new_hub: string | null;
  is_drop_off: boolean;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  decision_notes: string | null;
  created_at: string;
};

function BidAssignmentSection({
  userId,
  driverRank,
}: {
  userId: string;
  driverRank: number;
}) {
  const rosterRow = ROSTER.find((r) => r.rank === driverRank);
  const pickedBid = useMemo<SnapshotBid | null>(() => {
    if (!rosterRow || rosterRow.pick.kind !== "bid") return null;
    const pick = rosterRow.pick;
    return (
      ALL_BIDS.find((b) => b.jobNum === pick.jobNum && b.hub === pick.hub) ??
      null
    );
  }, [rosterRow]);

  const draft = useRouteDraft();
  const navigate = useNavigate();

  const loadBidIntoRoute = () => {
    if (!pickedBid) return;
    // Collect unique location codes across every leg of the bid in route order.
    const seen = new Set<string>();
    const codes: string[] = [];
    for (const leg of pickedBid.legs) {
      for (const tok of leg.routeTokens) {
        if (tok.kind !== "location") continue;
        if (seen.has(tok.code)) continue;
        seen.add(tok.code);
        codes.push(tok.code);
      }
    }
    if (codes.length < 2) return;
    // Replace the draft with this bid's stops.
    draft.clear();
    for (const c of codes) draft.addDirectory(c);
    navigate("/?tab=locations");
  };

  const [requests, setRequests] = useState<BidChangeRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data, error: err } = await sb
      .from("bid_change_requests")
      .select(
        "id, user_id, driver_rank, current_job_num, current_hub, new_job_num, new_hub, is_drop_off, reason, status, decision_notes, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);
    if (err) {
      if (!/(42P01|PGRST205|does not exist)/i.test(err.message ?? "")) {
        setError(err.message);
      }
      setRequests([]);
      return;
    }
    setRequests((data as BidChangeRequest[]) ?? []);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const cancel = async (id: string) => {
    const sb = getSupabase();
    if (!sb) return;
    if (!window.confirm("Cancel this pending bid-change request?")) return;
    const { error: err } = await sb
      .from("bid_change_requests")
      .delete()
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    reload();
  };

  const pendingRequest = requests.find((r) => r.status === "pending");

  return (
    <>
      <section className="card-strong p-5 relative overflow-hidden">
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-25 pointer-events-none"
          style={{
            background:
              "radial-gradient(closest-side, rgba(245,158,11,0.6), transparent 70%)",
            filter: "blur(36px)",
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div
                className="text-[11px] uppercase tracking-[0.3em] font-bold flex items-center gap-1.5"
                style={{ color: "rgb(var(--fg-faint))" }}
              >
                <Truck className="w-3 h-3 text-amber-300" />
                Your assigned bid
              </div>
              <div className="mt-1.5">
                {pickedBid ? (
                  <>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-3xl text-amber-300">
                        {pickedBid.jobNum}
                      </span>
                      <span
                        className="text-[11px] uppercase tracking-widest font-semibold"
                        style={{ color: "rgb(var(--fg-faint))" }}
                      >
                        {pickedBid.hub === "TOL"
                          ? "Toledo"
                          : pickedBid.hub === "NBL"
                            ? "N. Baltimore"
                            : "Sleeper"}
                      </span>
                    </div>
                    <div
                      className="text-[12px] mt-0.5"
                      style={{ color: "rgb(var(--fg-subtle))" }}
                    >
                      Starts {pickedBid.startTime24} ·{" "}
                      {pickedBid.qualifications}
                    </div>
                    {pickedBid.destinations.length > 0 && (
                      <div
                        className="text-[12px] mt-0.5 truncate"
                        style={{ color: "rgb(var(--fg-subtle))" }}
                      >
                        {pickedBid.destinations.slice(0, 6).join(" → ")}
                        {pickedBid.destinations.length > 6 ? "…" : ""}
                      </div>
                    )}
                  </>
                ) : rosterRow?.pick.kind === "onCall" ? (
                  <div className="text-sky-300 font-bold text-lg">
                    On-call ·{" "}
                    {rosterRow.pick.hub === "TOL" ? "Toledo" : "N. Baltimore"}
                    <span
                      className="ml-2 text-[11px] tabular"
                      style={{ color: "rgb(var(--fg-faint))" }}
                    >
                      pos #{rosterRow.pick.position}
                    </span>
                  </div>
                ) : (
                  <div
                    className="text-base"
                    style={{ color: "rgb(var(--fg-subtle))" }}
                  >
                    No bid on file (rank #{driverRank}).
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              {pickedBid && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={loadBidIntoRoute}
                  title="Load this route into the trip planner with all stops in order"
                >
                  <Map className="w-4 h-4" />
                  Map this route
                </button>
              )}
              <button
                type="button"
                className="btn"
                onClick={() => setShowRequestModal(true)}
                disabled={!!pendingRequest}
                title={
                  pendingRequest
                    ? "You already have a pending request"
                    : "Push a change to admin"
                }
              >
                <ArrowRightLeft className="w-4 h-4" />
                Request a change
              </button>
            </div>
          </div>

          {pendingRequest && (
            <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/40 p-3 flex items-start gap-2">
              <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0 text-[12px]">
                <div className="text-amber-200 font-semibold">
                  Change request pending review
                </div>
                <div
                  className="mt-0.5"
                  style={{ color: "rgb(var(--fg-subtle))" }}
                >
                  {pendingRequest.is_drop_off
                    ? "You asked to drop off your assigned bid."
                    : `You asked to switch to ${pendingRequest.new_job_num} (${labelHub(pendingRequest.new_hub)}).`}
                  {pendingRequest.reason ? ` "${pendingRequest.reason}"` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => cancel(pendingRequest.id)}
                className="text-[11px] underline-offset-2 hover:underline shrink-0"
                style={{ color: "rgb(var(--fg-faint))" }}
              >
                Cancel
              </button>
            </div>
          )}

          {requests
            .filter((r) => r.status !== "pending")
            .slice(0, 3)
            .map((r) => (
              <div
                key={r.id}
                className="mt-3 text-[12px] rounded-lg px-3 py-2"
                style={{
                  background: "rgb(var(--bg-raised) / 0.3)",
                  border: "1px solid rgb(var(--border) / 0.06)",
                }}
              >
                <span
                  className={
                    r.status === "approved"
                      ? "text-emerald-300 font-semibold"
                      : "text-rose-300 font-semibold"
                  }
                >
                  {r.status}
                </span>
                <span style={{ color: "rgb(var(--fg-subtle))" }}>
                  {" — "}
                  {r.is_drop_off
                    ? "drop off"
                    : `switch to ${r.new_job_num} (${labelHub(r.new_hub)})`}
                  {r.decision_notes ? ` · "${r.decision_notes}"` : ""}
                </span>
              </div>
            ))}

          {error && (
            <div className="mt-3 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-md p-2">
              {error}
            </div>
          )}
        </div>
      </section>

      {showRequestModal && (
        <BidChangeRequestModal
          userId={userId}
          driverRank={driverRank}
          currentJobNum={pickedBid?.jobNum ?? null}
          currentHub={pickedBid?.hub ?? null}
          onClose={() => setShowRequestModal(false)}
          onSubmitted={() => {
            setShowRequestModal(false);
            reload();
          }}
        />
      )}
    </>
  );
}

function labelHub(hub: string | null): string {
  if (hub === "TOL") return "Toledo";
  if (hub === "NBL") return "N. Baltimore";
  if (hub === "ALL") return "Sleeper";
  return hub ?? "—";
}

function BidChangeRequestModal({
  userId,
  driverRank,
  currentJobNum,
  currentHub,
  onClose,
  onSubmitted,
}: {
  userId: string;
  driverRank: number;
  currentJobNum: string | null;
  currentHub: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [mode, setMode] = useState<"switch" | "drop">("switch");
  const [newJobNum, setNewJobNum] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedBids = useMemo(
    () =>
      [...ALL_BIDS]
        .filter((b) => !(b.jobNum === currentJobNum && b.hub === currentHub))
        .sort((a, b) => a.jobNum.localeCompare(b.jobNum)),
    [currentJobNum, currentHub],
  );

  const selectedBid = useMemo(
    () => sortedBids.find((b) => `${b.hub}:${b.jobNum}` === newJobNum),
    [newJobNum, sortedBids],
  );

  const submit = async () => {
    setError(null);
    if (mode === "switch" && !selectedBid) {
      setError("Pick the bid you're switching to.");
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error: err } = await sb.from("bid_change_requests").insert({
      user_id: userId,
      driver_rank: driverRank,
      current_job_num: currentJobNum,
      current_hub: currentHub,
      new_job_num: mode === "drop" ? null : selectedBid?.jobNum ?? null,
      new_hub: mode === "drop" ? null : selectedBid?.hub ?? null,
      is_drop_off: mode === "drop",
      reason: reason.trim() || null,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSubmitted();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card-strong w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgb(var(--border) / 0.1)" }}
        >
          <div>
            <h2 className="text-lg font-semibold">Request a bid change</h2>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "rgb(var(--fg-faint))" }}
            >
              Goes to Samuel for review. Approval doesn't auto-update the
              snapshot — he'll re-snapshot once the change is paperworked.
            </p>
          </div>
          <button
            type="button"
            className="p-1.5 hover:bg-bg-hover rounded-md"
            style={{ color: "rgb(var(--fg-subtle))" }}
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <span
              className="text-[11px] uppercase tracking-wider font-semibold"
              style={{ color: "rgb(var(--fg-faint))" }}
            >
              Current bid
            </span>
            <div
              className="mt-1 rounded-xl px-3 py-2"
              style={{
                background: "rgb(var(--bg-raised) / 0.3)",
                border: "1px solid rgb(var(--border) / 0.08)",
              }}
            >
              {currentJobNum ? (
                <span className="font-mono font-bold text-amber-300">
                  {currentJobNum}{" "}
                  <span
                    className="text-[11px] uppercase tracking-widest"
                    style={{ color: "rgb(var(--fg-faint))" }}
                  >
                    {labelHub(currentHub)}
                  </span>
                </span>
              ) : (
                <span style={{ color: "rgb(var(--fg-subtle))" }}>None</span>
              )}
            </div>
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setMode("switch")}
              className={`flex-1 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                mode === "switch" ? "bg-amber-500/20 text-amber-200" : ""
              }`}
              style={{
                border:
                  mode === "switch"
                    ? "1px solid rgb(245 158 11 / 0.4)"
                    : "1px solid rgb(var(--border) / 0.1)",
                color: mode === "switch" ? undefined : "rgb(var(--fg-subtle))",
              }}
            >
              Switch to a different bid
            </button>
            <button
              type="button"
              onClick={() => setMode("drop")}
              className={`flex-1 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                mode === "drop" ? "bg-rose-500/20 text-rose-200" : ""
              }`}
              style={{
                border:
                  mode === "drop"
                    ? "1px solid rgb(244 63 94 / 0.4)"
                    : "1px solid rgb(var(--border) / 0.1)",
                color: mode === "drop" ? undefined : "rgb(var(--fg-subtle))",
              }}
            >
              Drop off
            </button>
          </div>

          {mode === "switch" && (
            <label className="block">
              <span
                className="text-[11px] uppercase tracking-wider font-semibold"
                style={{ color: "rgb(var(--fg-faint))" }}
              >
                New bid
              </span>
              <select
                className="input w-full mt-1"
                value={newJobNum}
                onChange={(e) => setNewJobNum(e.target.value)}
              >
                <option value="">Pick a bid…</option>
                {sortedBids.map((b) => (
                  <option key={`${b.hub}:${b.jobNum}`} value={`${b.hub}:${b.jobNum}`}>
                    {b.jobNum} · {labelHub(b.hub)} · starts {b.startTime24}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span
              className="text-[11px] uppercase tracking-wider font-semibold"
              style={{ color: "rgb(var(--fg-faint))" }}
            >
              Reason (optional)
            </span>
            <textarea
              className="input w-full mt-1 h-20 resize-none"
              placeholder="Family stuff, schedule conflict, traded with someone, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-md p-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3 border-t"
          style={{ borderColor: "rgb(var(--border) / 0.1)" }}
        >
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={busy || (mode === "switch" && !selectedBid)}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-4 h-4" />
            )}
            Send to admin
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Weekly earnings card (Account page) ───────────────────────────────

function WeeklyEarnings({ userId }: { userId: string }) {
  type Row = {
    started_at: string;
    hours_worked: number;
    earnings: number;
  };
  const [rows, setRows] = useState<Row[] | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    (async () => {
      const sundayLocal = new Date();
      sundayLocal.setDate(sundayLocal.getDate() - sundayLocal.getDay());
      sundayLocal.setHours(0, 0, 0, 0);
      const { data, error } = await sb
        .from("shift_history")
        .select("started_at, hours_worked, earnings")
        .eq("user_id", userId)
        .gte("started_at", sundayLocal.toISOString())
        .order("started_at", { ascending: false });
      if (!active) return;
      if (error) {
        if (/(42P01|PGRST205|does not exist)/i.test(error.message ?? "")) {
          setMissing(true);
        }
        setRows([]);
        return;
      }
      setRows(data as Row[]);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  if (rows == null) return null;

  const totalHours = rows.reduce(
    (sum, r) => sum + (Number(r.hours_worked) || 0),
    0,
  );
  const totalEarnings = rows.reduce(
    (sum, r) => sum + (Number(r.earnings) || 0),
    0,
  );

  return (
    <section className="card-strong p-5 relative overflow-hidden">
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(245,158,11,0.55), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div
            className="text-[11px] uppercase tracking-[0.3em] font-bold flex items-center gap-1.5"
            style={{ color: "rgb(var(--fg-faint))" }}
          >
            <CalendarRange className="w-3 h-3 text-amber-300" />
            This week
          </div>
          <div
            className="mt-2 font-mono font-extrabold tabular tracking-tight"
            style={{
              fontSize: "clamp(36px, 8vw, 56px)",
              color: "transparent",
              backgroundImage:
                "linear-gradient(180deg, rgb(252 211 77), rgb(245 158 11) 60%, rgb(217 119 6))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              filter: "drop-shadow(0 4px 18px rgb(245 158 11 / 0.35))",
              lineHeight: 1,
            }}
          >
            ${totalEarnings.toFixed(2)}
          </div>
          <div
            className="text-[12px] mt-1.5"
            style={{ color: "rgb(var(--fg-subtle))" }}
          >
            {rows.length} shift{rows.length === 1 ? "" : "s"} ·{" "}
            {totalHours.toFixed(2)} hrs
          </div>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgb(245 158 11 / 0.3), rgb(244 114 182 / 0.25))",
            border: "1px solid rgb(245 158 11 / 0.5)",
          }}
        >
          <DollarSign className="w-5 h-5 text-amber-300" />
        </div>
      </div>
      {missing && (
        <p
          className="mt-3 text-[11px] italic"
          style={{ color: "rgb(var(--fg-faint))" }}
        >
          Shift-history table isn't installed yet — re-run schema.sql in
          Supabase to start tracking weekly totals.
        </p>
      )}
    </section>
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
  const [bidReqs, setBidReqs] = useState<BidChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    const [claimsRes, bidsRes] = await Promise.all([
      sb
        .from("name_claims")
        .select(
          "id, user_id, driver_rank, driver_name, message, status, created_at",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      sb
        .from("bid_change_requests")
        .select(
          "id, user_id, driver_rank, current_job_num, current_hub, new_job_num, new_hub, is_drop_off, reason, status, decision_notes, created_at",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
    ]);
    setLoading(false);
    if (claimsRes.error) setError(claimsRes.error.message);
    else setClaims((claimsRes.data as AdminClaim[] | null) ?? []);
    if (
      bidsRes.error &&
      !/(42P01|PGRST205|does not exist)/i.test(bidsRes.error.message ?? "")
    ) {
      setError(bidsRes.error.message);
    } else {
      setBidReqs((bidsRes.data as BidChangeRequest[] | null) ?? []);
    }
  };

  const decideBidChange = async (
    req: BidChangeRequest,
    approve: boolean,
  ) => {
    const sb = getSupabase();
    if (!sb) return;
    setBusyId(req.id);
    setError(null);
    const { error: err } = await sb
      .from("bid_change_requests")
      .update({
        status: approve ? "approved" : "rejected",
        decided_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    setBusyId(null);
    if (err) setError(err.message);
    else load();
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

      {/* Bid change requests */}
      <div className="mt-5 pt-5 border-t" style={{ borderColor: "rgb(var(--border) / 0.1)" }}>
        <h3 className="text-[11px] uppercase tracking-[0.3em] text-amber-300 font-bold flex items-center gap-1.5">
          <ArrowRightLeft className="w-3 h-3" />
          Pending bid-change requests
        </h3>
        {loading ? null : bidReqs.length === 0 ? (
          <p className="text-sm text-slate-400 mt-2">
            No pending bid-change requests.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {bidReqs.map((r) => {
              const rosterRow = ROSTER.find((row) => row.rank === r.driver_rank);
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-bg-panel p-3"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-slate-100 font-semibold">
                        #{r.driver_rank} {rosterRow?.name ?? "Unknown driver"}
                      </div>
                      <div className="text-[12px] mt-0.5" style={{ color: "rgb(var(--fg-subtle))" }}>
                        {r.is_drop_off ? (
                          <span className="text-rose-300 font-semibold">
                            Wants to drop off
                          </span>
                        ) : (
                          <span>
                            <span className="font-mono text-amber-300">
                              {r.current_job_num ?? "—"}
                            </span>{" "}
                            <span className="text-slate-500">→</span>{" "}
                            <span className="font-mono text-amber-200 font-bold">
                              {r.new_job_num}
                            </span>{" "}
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                              {labelHub(r.new_hub)}
                            </span>
                          </span>
                        )}
                      </div>
                      {r.reason && (
                        <div className="text-[12px] text-slate-300 mt-1 italic">
                          "{r.reason}"
                        </div>
                      )}
                      <div className="text-[10px] mt-1" style={{ color: "rgb(var(--fg-faint))" }}>
                        Requested{" "}
                        {new Date(r.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        className="btn"
                        disabled={busyId === r.id}
                        onClick={() => decideBidChange(r, false)}
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busyId === r.id}
                        onClick={() => decideBidChange(r, true)}
                      >
                        {busyId === r.id ? (
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
      </div>

      {error && (
        <div className="flex items-start gap-2 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-md p-2 mt-3">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
