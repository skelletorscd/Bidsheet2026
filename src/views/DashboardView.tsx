import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  ListOrdered,
  MapPin,
  Phone,
  Truck,
  Users,
} from "lucide-react";
import { HEADLINE_COUNTS } from "../data/roster";
import { snapshotCapturedAt } from "../data/snapshots";

type Props = {
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
};

export function DashboardView({ onStatus }: Props) {
  useEffect(() => {
    onStatus({
      fetchedAt: snapshotCapturedAt().getTime(),
      loading: false,
      error: null,
      source: "snapshot",
    });
  }, [onStatus]);

  const capturedAt = snapshotCapturedAt();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Hero */}
        <section className="relative pt-8 sm:pt-12 pb-4">
          <div className="text-[11px] uppercase tracking-[0.45em] font-bold text-amber-300">
            Feeder Bids 2026
          </div>
          <h1 className="hero-title mt-3 text-[44px] sm:text-[88px] leading-[0.95] tracking-[-0.04em]" style={{ color: "rgb(var(--fg))" }}>
            Annual bids.
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, rgb(253 186 116), rgb(244 114 182), rgb(167 139 250))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Locked in.
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg max-w-xl leading-relaxed" style={{ color: "rgb(var(--fg-muted))" }}>
            The 2026 feeder bid has closed. Everything here is a permanent
            snapshot from{" "}
            <span className="font-semibold" style={{ color: "rgb(var(--fg))" }}>
              {capturedAt.toLocaleString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            .
          </p>
        </section>

        {/* Quick stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Building2}
            title="Toledo"
            big={`${HEADLINE_COUNTS.toledo.taken}/${HEADLINE_COUNTS.toledo.total}`}
            small="annual bids taken"
            accent="amber"
          />
          <StatCard
            icon={Building2}
            title="N. Baltimore"
            big={`${HEADLINE_COUNTS.nbloh.taken}/${HEADLINE_COUNTS.nbloh.total}`}
            small="annual bids taken"
            accent="emerald"
          />
          <StatCard
            icon={Truck}
            title="Sleeper teams"
            big={`${HEADLINE_COUNTS.sleeper.taken}/${HEADLINE_COUNTS.sleeper.total}`}
            small="team slots filled"
            accent="sky"
          />
          <StatCard
            icon={Users}
            title="Roster"
            big={`${HEADLINE_COUNTS.picked + HEADLINE_COUNTS.onCall}`}
            small={`of ${HEADLINE_COUNTS.totalDrivers} placed`}
            accent="fuchsia"
          />
        </section>

        {/* Nav tiles */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold mb-3">
            Jump to
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NavTile
              to="/?tab=seniority"
              icon={ListOrdered}
              title="Seniority"
              subtitle={`${HEADLINE_COUNTS.totalDrivers} drivers · picks + on-call status`}
              accent="fuchsia"
            />
            <NavTile
              to="/?tab=onCallToledo"
              icon={Phone}
              title="On-Call Toledo"
              subtitle={`${HEADLINE_COUNTS.onCallToledo.filled}/${HEADLINE_COUNTS.onCallToledo.total} drivers on the board`}
              accent="amber"
            />
            <NavTile
              to="/?tab=onCallNbl"
              icon={Phone}
              title="On-Call N. Baltimore"
              subtitle={`${HEADLINE_COUNTS.onCallNbloh.filled}/${HEADLINE_COUNTS.onCallNbloh.total} drivers on the board`}
              accent="emerald"
            />
            <NavTile
              to="/?tab=locations"
              icon={MapPin}
              title="Locations"
              subtitle="Addresses, phone numbers, turn-by-turn GPS"
              accent="yellow"
            />
          </div>
        </section>

        <p className="text-[11px] text-slate-500 text-center py-4">
          Snapshot taken{" "}
          {capturedAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          · Live Google Sheet is unlinked. Re-snapshot any time with{" "}
          <code className="text-slate-400">
            node scripts/snapshot-sheets.mjs
          </code>
          .
        </p>
      </div>
    </div>
  );
}

type Accent = "amber" | "emerald" | "sky" | "rose" | "fuchsia" | "yellow";

const ACCENT_BG: Record<Accent, string> = {
  amber: "from-amber-400/35 bg-amber-400/40",
  emerald: "from-emerald-400/35 bg-emerald-400/40",
  sky: "from-sky-400/35 bg-sky-400/40",
  rose: "from-rose-400/35 bg-rose-400/40",
  fuchsia: "from-fuchsia-400/35 bg-fuchsia-400/40",
  yellow: "from-yellow-400/35 bg-yellow-400/40",
};
const ACCENT_BORDER: Record<Accent, string> = {
  amber: "border-amber-400/40",
  emerald: "border-emerald-400/40",
  sky: "border-sky-400/40",
  rose: "border-rose-400/40",
  fuchsia: "border-fuchsia-400/40",
  yellow: "border-yellow-400/40",
};
const ACCENT_TEXT: Record<Accent, string> = {
  amber: "text-amber-300",
  emerald: "text-emerald-300",
  sky: "text-sky-300",
  rose: "text-rose-300",
  fuchsia: "text-fuchsia-300",
  yellow: "text-yellow-300",
};

function StatCard({
  icon: Icon,
  title,
  big,
  small,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  big: string;
  small: string;
  accent: Accent;
}) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-50 pointer-events-none ${ACCENT_BG[accent]}`}
        style={{ filter: "blur(32px)" }}
      />
      <div className="relative flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.2em] font-semibold"
          style={{ color: "rgb(var(--fg-faint))" }}
        >
          {title}
        </span>
        <Icon className={`w-4 h-4 ${ACCENT_TEXT[accent]}`} />
      </div>
      <div
        className={`relative text-4xl font-extrabold tabular mt-2 tracking-tight ${ACCENT_TEXT[accent]}`}
      >
        {big}
      </div>
      <div
        className="relative text-[11px] mt-1"
        style={{ color: "rgb(var(--fg-faint))" }}
      >
        {small}
      </div>
    </div>
  );
}

function NavTile({
  to,
  icon: Icon,
  title,
  subtitle,
  accent,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  accent: Accent;
}) {
  return (
    <Link
      to={to}
      className="group card p-5 flex items-center gap-4 relative overflow-hidden transition-all hover:scale-[1.02]"
    >
      <div
        className={`absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-35 pointer-events-none ${ACCENT_BG[accent]}`}
        style={{ filter: "blur(36px)" }}
      />
      <div
        className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${ACCENT_BG[accent]} via-transparent to-transparent border ${ACCENT_BORDER[accent]} flex items-center justify-center shrink-0`}
      >
        <Icon className={`w-5 h-5 ${ACCENT_TEXT[accent]}`} />
      </div>
      <div className="flex-1 min-w-0 relative">
        <div
          className="font-semibold text-[15px] tracking-tight"
          style={{ color: "rgb(var(--fg))" }}
        >
          {title}
        </div>
        <div
          className="text-[12px] truncate mt-0.5"
          style={{ color: "rgb(var(--fg-subtle))" }}
        >
          {subtitle}
        </div>
      </div>
      <ChevronRight
        className="w-5 h-5 relative shrink-0 transition-transform group-hover:translate-x-1"
        style={{ color: "rgb(var(--fg-faint))" }}
      />
    </Link>
  );
}
