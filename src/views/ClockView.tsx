import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BellOff,
  BellRing,
  CalendarDays,
  CircleDot,
  DollarSign,
  Loader2,
  Play,
  Square,
  Timer,
} from "lucide-react";
import { getSupabase, SUPABASE_CONFIGURED } from "../data/supabase";
import { Profile, useSession } from "../data/useSession";
import { ROSTER, ALL_BIDS, SnapshotBid } from "../data/roster";

type Props = {
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
  onOpenAuth: () => void;
};

const EIGHT_HRS_MS = 8 * 60 * 60 * 1000;
const TEN_HRS_MS = 10 * 60 * 60 * 1000;
const FOURTEEN_HRS_MS = 14 * 60 * 60 * 1000;
const OT_MULTIPLIER = 1.5;

/** Splits hours into straight-time (first 8) and time-and-a-half (rest)
 *  per the UPS Teamsters supplemental — applied to both the live
 *  earnings counter and the shift_history row. */
function computeEarnings(hours: number, rate: number) {
  const regularHours = Math.min(hours, 8);
  const overtimeHours = Math.max(0, hours - 8);
  const regular = regularHours * rate;
  const overtime = overtimeHours * rate * OT_MULTIPLIER;
  return {
    regular,
    overtime,
    total: regular + overtime,
    regularHours,
    overtimeHours,
  };
}

export function ClockView({ onStatus, onOpenAuth }: Props) {
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
    return <Empty text="Accounts aren't configured on this build yet." />;
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
  return (
    <Clocked
      profile={session.profile}
      userId={session.user.id}
      refreshProfile={session.refreshProfile}
    />
  );
}

function SignedOut({ onOpenAuth }: { onOpenAuth: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 sm:p-10 text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 items-center justify-center mb-4">
          <DollarSign className="w-8 h-8 text-amber-300" />
        </div>
        <h1
          className="text-2xl sm:text-3xl font-extrabold"
          style={{ color: "rgb(var(--fg))" }}
        >
          Pay Clock — punch in, watch the dollars roll
        </h1>
        <p className="mt-2 leading-relaxed" style={{ color: "rgb(var(--fg-subtle))" }}>
          Sign in to track shifts, see live earnings, and review week-by-week
          history.
        </p>
        <button
          onClick={onOpenAuth}
          className="btn btn-primary mt-5 px-5 py-2.5 text-base"
        >
          Sign in / Create account
        </button>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 sm:p-10">
        <div className="card p-5 border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold">Nothing here yet</h3>
          </div>
          <p className="text-sm" style={{ color: "rgb(var(--fg-subtle))" }}>
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Signed-in clock ───────────────────────────────────────────────────

type ShiftRow = {
  id: string;
  started_at: string;
  ended_at: string;
  hours_worked: number;
  hourly_rate_used: number;
  earnings: number;
  bid_job_num: string | null;
  bid_hub: string | null;
  was_auto_punched: boolean;
};

function Clocked({
  profile,
  userId,
  refreshProfile,
}: {
  profile: Profile | null;
  userId: string;
  refreshProfile: () => Promise<void>;
}) {
  const hourly = profile?.hourly_rate ?? null;
  const alertsOn = profile?.alerts_enabled ?? false;

  const assignedBid = useMemo<SnapshotBid | null>(() => {
    if (!profile?.claimed_driver_rank) return null;
    const rank = profile.claimed_driver_rank;
    const rosterRow = ROSTER.find((r) => r.rank === rank);
    if (!rosterRow || rosterRow.pick.kind !== "bid") return null;
    const pick = rosterRow.pick;
    return (
      ALL_BIDS.find((b) => b.jobNum === pick.jobNum && b.hub === pick.hub) ??
      null
    );
  }, [profile?.claimed_driver_rank]);

  const [busy, setBusy] = useState<null | "in" | "out" | "rates" | "alerts">(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [hourlyDraft, setHourlyDraft] = useState<string>(
    hourly != null ? String(hourly) : "",
  );
  useEffect(() => {
    setHourlyDraft(hourly != null ? String(hourly) : "");
  }, [hourly]);

  const clockedInAt = profile?.clocked_in_at
    ? new Date(profile.clocked_in_at).getTime()
    : null;

  const friendlyError = (err: { message?: string; code?: string }): string => {
    if (err.code === "42703" || (err.message ?? "").includes("does not exist")) {
      return "Database isn't fully migrated yet — Samuel needs to re-run the latest schema in Supabase.";
    }
    if (err.code === "PGRST204" || (err.message ?? "").includes("Could not find")) {
      return "Shift-history table is missing — re-run supabase/schema.sql so it gets created.";
    }
    return err.message ?? "Something went wrong.";
  };

  const clockIn = async (atTs?: number) => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy("in");
    setError(null);
    const iso = atTs ? new Date(atTs).toISOString() : new Date().toISOString();
    const { error: err } = await sb
      .from("profiles")
      .update({ clocked_in_at: iso })
      .eq("id", userId);
    if (err) {
      setBusy(null);
      setError(friendlyError(err));
      return;
    }
    await refreshProfile();
    setBusy(null);
  };

  const clockOut = async (autoPunched = false) => {
    const sb = getSupabase();
    if (!sb || !clockedInAt) return;
    setBusy("out");
    setError(null);
    const endedAt = autoPunched ? clockedInAt + FOURTEEN_HRS_MS : Date.now();
    const elapsedMs = Math.max(0, endedAt - clockedInAt);
    const cappedMs = Math.min(elapsedMs, FOURTEEN_HRS_MS);
    const hoursWorked = cappedMs / 3_600_000;
    const rate = hourly ?? 0;
    const { total: earnings } = computeEarnings(hoursWorked, rate);

    // Log the shift first so we don't lose it if the profile update fails.
    if (rate > 0 && cappedMs > 60_000) {
      const { error: histErr } = await sb.from("shift_history").insert({
        user_id: userId,
        driver_rank: profile?.claimed_driver_rank ?? null,
        bid_job_num: assignedBid?.jobNum ?? null,
        bid_hub: assignedBid?.hub ?? null,
        started_at: new Date(clockedInAt).toISOString(),
        ended_at: new Date(clockedInAt + cappedMs).toISOString(),
        hours_worked: round3(hoursWorked),
        hourly_rate_used: rate,
        earnings: round2(earnings),
        was_auto_punched: autoPunched,
      });
      if (histErr) {
        // Swallow the missing-table error so the user can still clock out.
        if (!/(42P01|PGRST205|does not exist)/i.test(histErr.message ?? "")) {
          console.error("shift insert", histErr);
        }
      }
    }

    const { error: profErr } = await sb
      .from("profiles")
      .update({ clocked_in_at: null })
      .eq("id", userId);
    if (profErr) {
      setBusy(null);
      setError(friendlyError(profErr));
      return;
    }
    await refreshProfile();
    setBusy(null);
  };

  const saveRates = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const n = Number(hourlyDraft);
    if (!Number.isFinite(n) || n < 0 || n > 999) {
      setError("Hourly rate must be a number between 0 and 999.");
      return;
    }
    setBusy("rates");
    setError(null);
    const { error: err } = await sb
      .from("profiles")
      .update({ hourly_rate: n })
      .eq("id", userId);
    if (err) {
      setBusy(null);
      setError(friendlyError(err));
      return;
    }
    await refreshProfile();
    setBusy(null);
  };

  const toggleAlerts = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy("alerts");
    setError(null);
    const next = !alertsOn;
    if (next && "Notification" in window && Notification.permission !== "granted") {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }
    const { error: err } = await sb
      .from("profiles")
      .update({ alerts_enabled: next })
      .eq("id", userId);
    if (err) {
      setBusy(null);
      setError(friendlyError(err));
      return;
    }
    await refreshProfile();
    setBusy(null);
  };

  const bidStartToday = useMemo(() => {
    if (!assignedBid) return null;
    const m = assignedBid.startTime24.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      Number(m[1]),
      Number(m[2]),
      0,
      0,
    ).getTime();
  }, [assignedBid]);

  // Auto-start the clock at the bid's start time today, if the driver:
  // - has a claimed bid + start time
  // - has set their hourly rate
  // - hasn't already clocked in
  // - has the app open (we only auto-start if currentTime is within ±2 min
  //   of the bid start, so it doesn't surprise them on day-old data)
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!bidStartToday || !hourly || clockedInAt || autoStartedRef.current) return;
    const tick = () => {
      const now = Date.now();
      const within = Math.abs(now - bidStartToday) < 2 * 60 * 1000;
      if (within && now >= bidStartToday) {
        autoStartedRef.current = true;
        clockIn(bidStartToday);
      }
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidStartToday, hourly, clockedInAt]);

  // Scheduled alerts for the active shift
  useEffect(() => {
    if (!clockedInAt || !alertsOn) return;
    const now = Date.now();
    const elapsed = now - clockedInAt;
    const timers: number[] = [];
    const schedule = (ms: number, title: string, body: string) => {
      if (elapsed >= ms) return;
      const id = window.setTimeout(() => fireNotification(title, body), ms - elapsed);
      timers.push(id);
    };
    schedule(TEN_HRS_MS, "10-hour mark", "You've been on for 10 hours. Clock out when your shift ends.");
    schedule(FOURTEEN_HRS_MS - 30 * 60 * 1000, "30 min to the 14-hr cap", "30 minutes until the 14-hr DOT cap — start wrapping up.");
    schedule(FOURTEEN_HRS_MS, "14-hr cap reached", "You've hit the 14-hr cap. Clocking you out now — adjust your time if needed.");
    const autoPunchId = window.setTimeout(() => {
      clockOut(true);
    }, Math.max(0, FOURTEEN_HRS_MS - elapsed));
    timers.push(autoPunchId);
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockedInAt, alertsOn]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.4em] font-bold text-amber-300">
            Pay Clock · live earnings
          </div>
          <h1
            className="mt-1 text-3xl sm:text-5xl font-extrabold tracking-tight"
            style={{ color: "rgb(var(--fg))" }}
          >
            {clockedInAt ? "On the clock." : "Ready to roll?"}
          </h1>
          <p
            className="mt-2 text-sm sm:text-base max-w-xl leading-relaxed"
            style={{ color: "rgb(var(--fg-subtle))" }}
          >
            Punch in and watch your dollars-earned tick up live. If you've
            claimed a bid, the clock auto-starts at your bid's posted start
            time. Tracks your shift, warns at the 10 h mark, auto-clocks
            you out at the 14 h DOT cap.
          </p>
        </div>

        {hourly == null && (
          <section className="card-strong p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-amber-300" />
              <h2 className="font-semibold">Set your hourly rate</h2>
            </div>
            <p className="text-sm mb-3" style={{ color: "rgb(var(--fg-subtle))" }}>
              Top feeder rate is around $49/hr depending on your progression.
              Use whatever matches your pay stub.
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold"
                  style={{ color: "rgb(var(--fg-faint))" }}
                >
                  $
                </span>
                <input
                  className="input w-full pl-7 tabular"
                  type="number"
                  step="0.01"
                  placeholder="46.50"
                  value={hourlyDraft}
                  onChange={(e) => setHourlyDraft(e.target.value)}
                  autoFocus
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveRates}
                disabled={busy === "rates" || !hourlyDraft}
              >
                {busy === "rates" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          </section>
        )}

        {hourly != null && (
          <>
            {clockedInAt ? (
              <ActiveClock
                clockedInAt={clockedInAt}
                hourly={hourly}
                onClockOut={() => clockOut(false)}
                busy={busy === "out"}
              />
            ) : (
              <IdleClock
                hourly={hourly}
                assignedBid={assignedBid}
                bidStartToday={bidStartToday}
                onClockInNow={() => clockIn()}
                onClockInAtBid={() => bidStartToday && clockIn(bidStartToday)}
                busy={busy === "in"}
              />
            )}
          </>
        )}

        {hourly != null && (
          <section className="card p-5">
            <h3
              className="text-[11px] uppercase tracking-[0.3em] font-bold mb-2"
              style={{ color: "rgb(var(--fg-faint))" }}
            >
              Hourly rate
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 font-bold"
                  style={{ color: "rgb(var(--fg-faint))" }}
                >
                  $
                </span>
                <input
                  className="input w-full pl-6 tabular"
                  type="number"
                  step="0.01"
                  value={hourlyDraft}
                  onChange={(e) => setHourlyDraft(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn"
                onClick={saveRates}
                disabled={busy === "rates" || hourlyDraft === String(hourly)}
              >
                {busy === "rates" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </section>
        )}

        <section className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                className="text-[11px] uppercase tracking-[0.3em] font-bold mb-1"
                style={{ color: "rgb(var(--fg-faint))" }}
              >
                Shift alerts
              </h3>
              <p className="text-sm" style={{ color: "rgb(var(--fg-subtle))" }}>
                Browser notifications at 10 h · 13.5 h · 14 h (auto-punch out).
              </p>
            </div>
            <button
              type="button"
              className={`btn ${alertsOn ? "btn-primary" : ""}`}
              onClick={toggleAlerts}
              disabled={busy === "alerts"}
            >
              {busy === "alerts" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : alertsOn ? (
                <BellRing className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
              {alertsOn ? "On" : "Off"}
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-2 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <ShiftHistory userId={userId} />
      </div>
    </div>
  );
}

// ─── Idle ──────────────────────────────────────────────────────────────

function IdleClock({
  hourly,
  assignedBid,
  bidStartToday,
  onClockInNow,
  onClockInAtBid,
  busy,
}: {
  hourly: number;
  assignedBid: SnapshotBid | null;
  bidStartToday: number | null;
  onClockInNow: () => void;
  onClockInAtBid: () => void;
  busy: boolean;
}) {
  const now = Date.now();
  const bidInPast = bidStartToday != null && bidStartToday <= now;
  const bidInFuture = bidStartToday != null && bidStartToday > now;

  return (
    <section className="card-strong p-6 sm:p-8">
      {assignedBid && (
        <div className="mb-5">
          <div
            className="text-[11px] uppercase tracking-[0.3em] font-bold mb-1"
            style={{ color: "rgb(var(--fg-faint))" }}
          >
            Your assigned route
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono font-bold text-2xl text-amber-300">
              {assignedBid.jobNum}
            </span>
            <span className="text-sm" style={{ color: "rgb(var(--fg-subtle))" }}>
              starts at{" "}
              <span
                className="font-semibold tabular"
                style={{ color: "rgb(var(--fg))" }}
              >
                {assignedBid.startTime24}
              </span>
              {bidInFuture && (
                <>
                  {" "}
                  · auto-clock-in in{" "}
                  <span style={{ color: "rgb(var(--fg))" }}>
                    {formatInX(bidStartToday! - now)}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onClockInNow}
        disabled={busy}
        className="w-full py-5 rounded-2xl font-bold text-xl tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        style={{
          background:
            "linear-gradient(135deg, rgb(245 158 11 / 0.3), rgb(244 114 182 / 0.3))",
          border: "1px solid rgb(245 158 11 / 0.5)",
          color: "rgb(252 211 77)",
          boxShadow: "0 10px 40px -10px rgb(245 158 11 / 0.5)",
        }}
      >
        {busy ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        ) : (
          <span className="inline-flex items-center gap-2">
            <Play className="w-5 h-5" />
            Clock in now
          </span>
        )}
      </button>

      {bidInPast && (
        <button
          type="button"
          onClick={onClockInAtBid}
          className="w-full mt-2.5 btn text-sm"
        >
          <Timer className="w-4 h-4" />
          Start at today's bid time (
          {new Date(bidStartToday!).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
          )
        </button>
      )}

      <p
        className="text-[12px] text-center mt-4"
        style={{ color: "rgb(var(--fg-faint))" }}
      >
        Your rate is ${hourly.toFixed(2)}/hr — edit any time below.
      </p>
    </section>
  );
}

// ─── Active ────────────────────────────────────────────────────────────

function ActiveClock({
  clockedInAt,
  hourly,
  onClockOut,
  busy,
}: {
  clockedInAt: number;
  hourly: number;
  onClockOut: () => void;
  busy: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let last = performance.now();
    const tick = () => {
      const t = performance.now();
      if (t - last >= 40) {
        setNow(Date.now());
        last = t;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const elapsedMs = Math.max(0, now - clockedInAt);
  const cappedMs = Math.min(elapsedMs, FOURTEEN_HRS_MS);
  const cappedHours = cappedMs / 3_600_000;
  const earningsBreakdown = computeEarnings(cappedHours, hourly);
  const earnings = earningsBreakdown.total;
  const hours = Math.floor(cappedMs / 3_600_000);
  const minutes = Math.floor((cappedMs % 3_600_000) / 60_000);
  const seconds = Math.floor((cappedMs % 60_000) / 1000);
  const pastEight = elapsedMs >= EIGHT_HRS_MS;
  const pastTen = elapsedMs >= TEN_HRS_MS;
  const pastFourteen = elapsedMs >= FOURTEEN_HRS_MS;

  const earningsStr = earnings.toFixed(4);

  return (
    <section
      className="card-strong p-6 sm:p-8 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 80% at 50% -10%, rgb(245 158 11 / 0.18), rgb(var(--bg-panel) / 0.08))",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-emerald-300">
            On the clock
          </span>
          {pastEight && (
            <span
              className="text-[10px] uppercase tracking-[0.3em] font-extrabold px-2 py-0.5 rounded-full"
              style={{
                background: "linear-gradient(135deg, rgb(244 114 182 / 0.4), rgb(245 158 11 / 0.4))",
                border: "1px solid rgb(244 114 182 / 0.6)",
                color: "rgb(252 231 243)",
                boxShadow: "0 0 18px rgb(244 114 182 / 0.5)",
              }}
            >
              ⚡ OT · 1.5×
            </span>
          )}
        </div>
        <div
          className="text-[11px] tabular"
          style={{ color: "rgb(var(--fg-faint))" }}
        >
          Started at{" "}
          <span style={{ color: "rgb(var(--fg-muted))" }}>
            {new Date(clockedInAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <div className="text-center py-4">
        <div
          className="inline-flex items-baseline gap-1 tabular font-mono font-extrabold tracking-tight"
          style={{
            fontSize: "clamp(48px, 15vw, 140px)",
            color: "transparent",
            backgroundImage:
              "linear-gradient(180deg, rgb(252 211 77), rgb(245 158 11) 60%, rgb(217 119 6))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            filter: "drop-shadow(0 6px 30px rgb(245 158 11 / 0.5))",
            lineHeight: 0.9,
          }}
        >
          <span
            style={{ fontSize: "0.45em", lineHeight: 1, paddingTop: "0.25em" }}
          >
            $
          </span>
          <span>{earningsStr}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5">
        <Stat
          label="Elapsed"
          value={`${hours}h ${String(minutes).padStart(2, "0")}m`}
          sub={`${String(seconds).padStart(2, "0")}s`}
        />
        <Stat
          label={pastEight ? "Pay split" : "Rate"}
          value={
            pastEight
              ? `$${earningsBreakdown.regular.toFixed(0)} · $${earningsBreakdown.overtime.toFixed(0)}`
              : `$${hourly.toFixed(2)}`
          }
          sub={
            pastEight
              ? `${earningsBreakdown.regularHours.toFixed(1)}h base + ${earningsBreakdown.overtimeHours.toFixed(1)}h OT`
              : `straight-time · OT @ 8h`
          }
          tone={pastEight ? "amber" : "slate"}
        />
        <Stat
          label="Next cap"
          value={pastFourteen ? "14 h ✓" : pastTen ? "14h limit" : "10h soft"}
          sub={pastFourteen ? "auto-out" : formatUntilCap(cappedMs)}
          tone={pastFourteen ? "rose" : pastTen ? "amber" : "slate"}
        />
      </div>

      {pastTen && !pastFourteen && (
        <div className="mt-4 flex items-start gap-2 text-amber-200 text-[12px] bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <Timer className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Past your 10-hour soft mark. You can keep going up to 14 h (DOT
            cap). After that you'll be auto-punched out.
          </span>
        </div>
      )}
      {pastFourteen && (
        <div className="mt-4 flex items-start gap-2 text-rose-300 text-[12px] bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
          <CircleDot className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            14-hour cap reached. Earnings display is capped at 14 hrs even
            though you may still be working. Clock out so your reset math is
            right.
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onClockOut}
        disabled={busy}
        className="w-full mt-5 py-4 rounded-2xl font-bold text-lg tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        style={{
          background: "rgb(244 63 94 / 0.15)",
          border: "1px solid rgb(244 63 94 / 0.4)",
          color: "rgb(253 164 175)",
        }}
      >
        {busy ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : (
          <span className="inline-flex items-center gap-2">
            <Square className="w-4 h-4" />
            Clock out & save shift
          </span>
        )}
      </button>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "slate" | "amber" | "rose";
}) {
  const color =
    tone === "amber"
      ? "text-amber-300"
      : tone === "rose"
        ? "text-rose-300"
        : undefined;
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-center"
      style={{
        background: "rgb(var(--bg-raised) / 0.3)",
        border: "1px solid rgb(var(--border) / 0.08)",
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wider font-semibold"
        style={{ color: "rgb(var(--fg-faint))" }}
      >
        {label}
      </div>
      <div
        className={`tabular font-bold text-[17px] mt-0.5 ${color ?? ""}`}
        style={color ? undefined : { color: "rgb(var(--fg))" }}
      >
        {value}
      </div>
      <div className="text-[10px]" style={{ color: "rgb(var(--fg-faint))" }}>
        {sub}
      </div>
    </div>
  );
}

// ─── History ───────────────────────────────────────────────────────────

function ShiftHistory({ userId }: { userId: string }) {
  const [shifts, setShifts] = useState<ShiftRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data, error: err } = await sb
      .from("shift_history")
      .select(
        "id, started_at, ended_at, hours_worked, hourly_rate_used, earnings, bid_job_num, bid_hub, was_auto_punched",
      )
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(60);
    if (err) {
      // Fail soft — table missing or anything else; don't block the page.
      console.error("shift history load", err);
      if (!/(42P01|PGRST205|does not exist)/i.test(err.message ?? "")) {
        setError(err.message);
      }
      setShifts([]);
      return;
    }
    setShifts((data ?? []) as ShiftRow[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (shifts == null) return null;

  const buckets = bucketByWeek(shifts);

  return (
    <section>
      <h2 className="text-[11px] uppercase tracking-[0.3em] font-bold mb-2 flex items-center gap-1.5" style={{ color: "rgb(var(--fg-faint))" }}>
        <CalendarDays className="w-3 h-3 text-amber-300" />
        Shift history
      </h2>
      {shifts.length === 0 ? (
        <div className="card p-5 text-center text-sm" style={{ color: "rgb(var(--fg-subtle))" }}>
          No shifts logged yet. Once you clock out, this fills with your
          week-by-week earnings.
        </div>
      ) : (
        <div className="space-y-3">
          {buckets.map((b) => (
            <div key={b.label} className="card p-4">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "rgb(var(--fg-faint))" }}>
                    {b.label}
                  </div>
                  <div className="text-[12px]" style={{ color: "rgb(var(--fg-subtle))" }}>
                    {b.shifts.length} shift{b.shifts.length === 1 ? "" : "s"} ·{" "}
                    {round2(b.totalHours).toFixed(2)} hrs
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold tabular text-amber-300">
                    ${b.totalEarnings.toFixed(2)}
                  </div>
                  <div className="text-[11px]" style={{ color: "rgb(var(--fg-faint))" }}>
                    earnings
                  </div>
                </div>
              </div>
              <ul className="space-y-1">
                {b.shifts.map((s) => (
                  <ShiftRow key={s.id} shift={s} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="mt-3 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
          {error}
        </div>
      )}
    </section>
  );
}

function ShiftRow({ shift }: { shift: ShiftRow }) {
  const start = new Date(shift.started_at);
  const end = new Date(shift.ended_at);
  const breakdown = computeEarnings(
    Number(shift.hours_worked) || 0,
    Number(shift.hourly_rate_used) || 0,
  );
  const hasOt = breakdown.overtimeHours > 0;
  return (
    <li
      className="rounded-lg px-3 py-2 flex items-center gap-3 text-[12px]"
      style={{
        background: "rgb(var(--bg-raised) / 0.3)",
        border: "1px solid rgb(var(--border) / 0.06)",
      }}
    >
      <div className="w-14 shrink-0">
        <div className="font-semibold" style={{ color: "rgb(var(--fg))" }}>
          {start.toLocaleDateString("en-US", { weekday: "short" })}
        </div>
        <div className="text-[10px] tabular" style={{ color: "rgb(var(--fg-faint))" }}>
          {start.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="tabular truncate" style={{ color: "rgb(var(--fg))" }}>
          {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          {" → "}
          {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          {hasOt && (
            <span className="ml-1.5 text-[10px] font-bold text-fuchsia-300">
              ⚡ {breakdown.overtimeHours.toFixed(1)}h OT
            </span>
          )}
          {shift.was_auto_punched && (
            <span className="ml-1.5 text-[10px] text-rose-300/80">
              · auto-out
            </span>
          )}
        </div>
        <div className="text-[10px] tabular" style={{ color: "rgb(var(--fg-faint))" }}>
          {shift.bid_job_num ? `${shift.bid_job_num} · ` : ""}
          {Number(shift.hours_worked).toFixed(2)} hrs · $
          {Number(shift.hourly_rate_used).toFixed(2)}/hr
        </div>
      </div>
      <div className="font-bold tabular text-amber-300">
        ${Number(shift.earnings).toFixed(2)}
      </div>
    </li>
  );
}

type WeekBucket = {
  label: string;
  weekStart: number; // ms
  shifts: ShiftRow[];
  totalHours: number;
  totalEarnings: number;
};

function bucketByWeek(shifts: ShiftRow[]): WeekBucket[] {
  const buckets = new Map<number, WeekBucket>();
  for (const s of shifts) {
    const start = new Date(s.started_at);
    const sun = startOfWeek(start);
    const key = sun.getTime();
    let b = buckets.get(key);
    if (!b) {
      b = {
        weekStart: key,
        label: weekLabel(sun),
        shifts: [],
        totalHours: 0,
        totalEarnings: 0,
      };
      buckets.set(key, b);
    }
    b.shifts.push(s);
    b.totalHours += Number(s.hours_worked) || 0;
    b.totalEarnings += Number(s.earnings) || 0;
  }
  return [...buckets.values()].sort((a, b) => b.weekStart - a.weekStart);
}

function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - out.getDay()); // Sunday
  return out;
}

function weekLabel(sun: Date): string {
  const today = startOfWeek(new Date()).getTime();
  const lastWeek = today - 7 * 86_400_000;
  if (sun.getTime() === today) return "This week";
  if (sun.getTime() === lastWeek) return "Last week";
  const sat = new Date(sun);
  sat.setDate(sat.getDate() + 6);
  return `${sun.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sat.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function formatInX(ms: number): string {
  if (ms <= 0) return "now";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const restMins = mins % 60;
  return `${hrs}h ${restMins}m`;
}

function formatUntilCap(cappedMs: number): string {
  const remain = FOURTEEN_HRS_MS - cappedMs;
  if (remain <= 0) return "reached";
  return `${formatInX(remain)} left`;
}

function fireNotification(title: string, body: string): void {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icon.svg" });
  } catch {
    // ignore
  }
}
