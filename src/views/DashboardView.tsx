import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  ListOrdered,
  MapPin,
  Phone,
  ScrollText,
  Truck,
  Users,
} from "lucide-react";

// Retained for Locations NavTile (below).
void MapPin;
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
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-bg-panel to-bg-base p-6 sm:p-8">
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-25 pointer-events-none"
            style={{
              background:
                "radial-gradient(closest-side, rgba(245,158,11,0.7), transparent 70%)",
              animation: "pulseDot 4s ease-in-out infinite",
            }}
          />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.4em] text-amber-300 font-bold">
              Feeder Bids 2026
            </div>
            <h1 className="mt-2 font-extrabold text-3xl sm:text-5xl text-slate-50 tracking-tight">
              Annual bids · locked in
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              The 2026 annual feeder bid has closed. Everything on this site is
              a permanent snapshot taken{" "}
              <span className="text-amber-200 font-semibold">
                {capturedAt.toLocaleString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>{" "}
              — the Google Sheet can change, this won't.
            </p>
          </div>
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
              to="/?tab=bidSheet"
              icon={ScrollText}
              title="Bid sheet"
              subtitle={`Toledo · N. Baltimore · Sleeper · ${HEADLINE_COUNTS.toledo.total + HEADLINE_COUNTS.nbloh.total + HEADLINE_COUNTS.sleeper.total} annual runs`}
              accent="rose"
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
  amber: "from-amber-500/15",
  emerald: "from-emerald-500/15",
  sky: "from-sky-500/15",
  rose: "from-rose-500/15",
  fuchsia: "from-fuchsia-500/15",
  yellow: "from-yellow-500/15",
};
const ACCENT_BORDER: Record<Accent, string> = {
  amber: "border-amber-500/40",
  emerald: "border-emerald-500/40",
  sky: "border-sky-500/40",
  rose: "border-rose-500/40",
  fuchsia: "border-fuchsia-500/40",
  yellow: "border-yellow-500/40",
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
    <div
      className={`card bg-gradient-to-br ${ACCENT_BG[accent]} via-transparent to-transparent ${ACCENT_BORDER[accent]} p-4`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          {title}
        </span>
        <Icon className={`w-4 h-4 ${ACCENT_TEXT[accent]}`} />
      </div>
      <div className={`text-3xl font-extrabold tabular mt-1 ${ACCENT_TEXT[accent]}`}>
        {big}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{small}</div>
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
      className={`group card p-4 flex items-center gap-4 hover:bg-bg-hover transition-colors ${ACCENT_BORDER[accent]}`}
    >
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${ACCENT_BG[accent]} via-transparent to-transparent border ${ACCENT_BORDER[accent]} flex items-center justify-center shrink-0`}
      >
        <Icon className={`w-5 h-5 ${ACCENT_TEXT[accent]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-slate-100 font-semibold">{title}</div>
        <div className="text-[12px] text-slate-400 truncate">{subtitle}</div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-amber-300 transition-colors shrink-0" />
    </Link>
  );
}
