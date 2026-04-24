import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BellOff,
  BellRing,
  CircleDot,
  Clock,
  DollarSign,
  Loader2,
  Play,
  Square,
  Timer,
} from "lucide-react";
import { getSupabase, SUPABASE_CONFIGURED } from "../data/supabase";
import { Profile, useSession } from "../data/useSession";
import { ROSTER } from "../data/roster";
import { ALL_BIDS } from "../data/roster";

type Props = {
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
  onOpenAuth: () => void;
};

const TEN_HRS_MS = 10 * 60 * 60 * 1000;
const FOURTEEN_HRS_MS = 14 * 60 * 60 * 1000;

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
  return <Clocked profile={session.profile} userId={session.user.id} />;
}

// ─── Signed-out ────────────────────────────────────────────────────────

function SignedOut({ onOpenAuth }: { onOpenAuth: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 sm:p-10 text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-amber-300" />
        </div>
        <h1
          className="text-2xl sm:text-3xl font-extrabold"
          style={{ color: "rgb(var(--fg))" }}
        >
          Clock in, watch the money roll
        </h1>
        <p className="mt-2 leading-relaxed" style={{ color: "rgb(var(--fg-subtle))" }}>
          Sign in to track your shift and see your earnings tick up live, like
          a gas-pump display.
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

function Clocked({
  profile,
  userId,
}: {
  profile: Profile | null;
  userId: string;
}) {
  const hourly = profile?.hourly_rate ?? null;
  const alertsOn = profile?.alerts_enabled ?? false;

  // The driver's bid (if any) so we can show route + offer auto-start.
  const assignedBid = useMemo(() => {
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
    setBusy(null);
    if (err) setError(err.message);
  };

  const clockOut = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy("out");
    setError(null);
    const { error: err } = await sb
      .from("profiles")
      .update({ clocked_in_at: null })
      .eq("id", userId);
    setBusy(null);
    if (err) setError(err.message);
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
    setBusy(null);
    if (err) setError(err.message);
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
    setBusy(null);
    if (err) setError(err.message);
  };

  const bidStartToday = useMemo(() => {
    if (!assignedBid) return null;
    const m = assignedBid.startTime24.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const now = new Date();
    const ts = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      Number(m[1]),
      Number(m[2]),
      0,
      0,
    ).getTime();
    return ts;
  }, [assignedBid]);

  // Scheduled alerts: once at 10 h (soft), once at ~13.5 h (heads-up), and
  // auto-punch-out at 14 h if the row still says clocked_in.
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
      clockOut();
    }, Math.max(0, FOURTEEN_HRS_MS - elapsed));
    timers.push(autoPunchId);
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockedInAt, alertsOn]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Headline */}
        <div>
          <div
            className="text-[11px] uppercase tracking-[0.4em] font-bold text-amber-300"
          >
            Clock
          </div>
          <h1
            className="mt-1 text-3xl sm:text-5xl font-extrabold tracking-tight"
            style={{ color: "rgb(var(--fg))" }}
          >
            {clockedInAt ? "On the clock." : "Ready to roll?"}
          </h1>
        </div>

        {/* Rate setup (shown once until a rate is saved) */}
        {hourly == null && (
          <section className="card-strong p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-amber-300" />
              <h2 className="font-semibold">Set your hourly rate</h2>
            </div>
            <p className="text-sm mb-3" style={{ color: "rgb(var(--fg-subtle))" }}>
              Top feeder rate is around $49/hr depending on your progression. Use
              whatever matches your pay stub.
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

        {/* Clock state */}
        {hourly != null && (
          <>
            {clockedInAt ? (
              <ActiveClock
                clockedInAt={clockedInAt}
                hourly={hourly}
                onClockOut={clockOut}
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

        {/* Rate editor (when already set) */}
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

        {/* Alerts */}
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
      </div>
    </div>
  );
}

// ─── Idle (not clocked in) ─────────────────────────────────────────────

function IdleClock({
  hourly,
  assignedBid,
  bidStartToday,
  onClockInNow,
  onClockInAtBid,
  busy,
}: {
  hourly: number;
  assignedBid: (typeof ALL_BIDS)[number] | null;
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
      {bidInFuture && (
        <p
          className="text-[12px] text-center mt-3 italic"
          style={{ color: "rgb(var(--fg-faint))" }}
        >
          Your bid starts in{" "}
          {formatInX(bidStartToday! - now)} — clock will auto-start if you
          open the app then, or you can clock in now.
        </p>
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

// ─── Active clock ──────────────────────────────────────────────────────

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

  // Requestanimationframe-driven tick for the smooth gas-pump effect.
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
  const earnings = (cappedMs / 3_600_000) * hourly;
  const hours = Math.floor(cappedMs / 3_600_000);
  const minutes = Math.floor((cappedMs % 3_600_000) / 60_000);
  const seconds = Math.floor((cappedMs % 60_000) / 1000);
  const pastTen = elapsedMs >= TEN_HRS_MS;
  const pastFourteen = elapsedMs >= FOURTEEN_HRS_MS;

  // Gas-pump-style rapid digits: hundredths of a cent.
  const earningsStr = earnings.toFixed(4);

  return (
    <section
      className="card-strong p-6 sm:p-8 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 80% at 50% -10%, rgb(245 158 11 / 0.18), rgb(var(--bg-panel) / 0.08))",
      }}
    >
      {/* Live indicator */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.4em] font-bold text-emerald-300"
          >
            On the clock
          </span>
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

      {/* The big money counter */}
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

      {/* Elapsed + rate */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <Stat label="Elapsed" value={`${hours}h ${String(minutes).padStart(2, "0")}m`} sub={`${String(seconds).padStart(2, "0")}s`} />
        <Stat
          label="Rate"
          value={`$${hourly.toFixed(2)}`}
          sub="per hour"
        />
        <Stat
          label="Next cap"
          value={pastFourteen ? "14 h ✓" : pastTen ? "14h limit" : "10h soft"}
          sub={pastFourteen ? "auto-out" : formatUntilCap(cappedMs)}
          tone={pastFourteen ? "rose" : pastTen ? "amber" : "slate"}
        />
      </div>

      {pastTen && !pastFourteen && (
        <div
          className="mt-4 flex items-start gap-2 text-amber-200 text-[12px] bg-amber-500/10 border border-amber-500/30 rounded-xl p-3"
        >
          <Timer className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Past your 10-hour soft mark. You can keep going up to 14 h
            (DOT cap). After that you'll be auto-punched out.
          </span>
        </div>
      )}
      {pastFourteen && (
        <div
          className="mt-4 flex items-start gap-2 text-rose-300 text-[12px] bg-rose-500/10 border border-rose-500/30 rounded-xl p-3"
        >
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
            Clock out
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

// ─── Helpers ──────────────────────────────────────────────────────────

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
