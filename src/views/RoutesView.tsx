import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  Map,
  Search,
  Truck,
  X,
} from "lucide-react";
import { ALL_BIDS, SnapshotBid, ROSTER } from "../data/roster";
import { useRouteDraft } from "../data/useRouteDraft";

type Props = {
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
};

type HubFilter = "TOL" | "NBL" | "ALL";

const HUB_TABS: { key: HubFilter; label: string; icon: typeof Building2 }[] = [
  { key: "TOL", label: "Toledo", icon: Building2 },
  { key: "NBL", label: "North Baltimore", icon: Building2 },
  { key: "ALL", label: "Sleeper", icon: Truck },
];

export function RoutesView({ onStatus }: Props) {
  const [hub, setHub] = useState<HubFilter>("TOL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    onStatus({
      fetchedAt: Date.now(),
      loading: false,
      error: null,
      source: "snapshot",
    });
  }, [onStatus]);

  const bids = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_BIDS.filter((b) => b.hub === hub).filter((b) => {
      if (!q) return true;
      return (
        b.jobNum.toLowerCase().includes(q) ||
        b.qualifications.toLowerCase().includes(q) ||
        b.legs.some((l) => l.routeRaw.toLowerCase().includes(q)) ||
        b.startTime24.includes(q)
      );
    });
  }, [hub, search]);

  const counts = useMemo(
    () => ({
      TOL: ALL_BIDS.filter((b) => b.hub === "TOL").length,
      NBL: ALL_BIDS.filter((b) => b.hub === "NBL").length,
      ALL: ALL_BIDS.filter((b) => b.hub === "ALL").length,
    }),
    [],
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.4em] font-bold text-amber-300">
            Routes
          </div>
          <h1
            className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: "rgb(var(--fg))" }}
          >
            Browse every bid on the board
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "rgb(var(--fg-subtle))" }}
          >
            Tap a bid to see each day's leg + the stops, or jump straight to
            mapping the whole route.
          </p>
        </div>

        {/* Hub sub-tabs */}
        <div className="flex flex-wrap gap-1.5">
          {HUB_TABS.map((t) => {
            const Icon = t.icon;
            const active = hub === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setHub(t.key);
                  setExpanded(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                  active ? "bg-amber-500/20 text-amber-200" : ""
                }`}
                style={{
                  border: active
                    ? "1px solid rgb(245 158 11 / 0.4)"
                    : "1px solid rgb(var(--border) / 0.1)",
                  color: active ? undefined : "rgb(var(--fg-subtle))",
                  background: active
                    ? undefined
                    : "rgb(var(--bg-raised) / 0.3)",
                }}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                <span
                  className={`ml-1 text-[11px] tabular ${
                    active ? "text-amber-300/80" : ""
                  }`}
                  style={{ color: active ? undefined : "rgb(var(--fg-faint))" }}
                >
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "rgb(var(--fg-faint))" }}
          />
          <input
            className="input w-full pl-11 pr-10 py-3 text-base"
            placeholder="Search job # (WP01), city code (TOLOH), or start time…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md"
              style={{ color: "rgb(var(--fg-faint))" }}
              aria-label="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div
          className="text-[11px] tabular"
          style={{ color: "rgb(var(--fg-faint))" }}
        >
          {bids.length} of {counts[hub]} {HUB_TABS.find((t) => t.key === hub)?.label} bids shown
        </div>

        {/* Bid list */}
        {bids.length === 0 ? (
          <div
            className="card p-8 text-center text-sm"
            style={{ color: "rgb(var(--fg-subtle))" }}
          >
            No bids match.
          </div>
        ) : (
          <ul className="space-y-2">
            {bids.map((b) => (
              <BidCard
                key={`${b.hub}-${b.jobNum}`}
                bid={b}
                expanded={expanded === b.jobNum}
                onToggle={() =>
                  setExpanded(expanded === b.jobNum ? null : b.jobNum)
                }
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BidCard({
  bid,
  expanded,
  onToggle,
}: {
  bid: SnapshotBid;
  expanded: boolean;
  onToggle: () => void;
}) {
  const draft = useRouteDraft();
  const navigate = useNavigate();

  const takenBy = useMemo(() => {
    if (bid.takers.length === 0) return null;
    return bid.takers.join(" + ");
  }, [bid.takers]);

  const takerRosterRow = useMemo(() => {
    if (!takenBy) return null;
    return ROSTER.find((r) => {
      if (r.pick.kind !== "bid") return false;
      return r.pick.jobNum === bid.jobNum && r.pick.hub === bid.hub;
    });
  }, [bid, takenBy]);

  const loadIntoRoute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const seen = new Set<string>();
    const codes: string[] = [];
    for (const leg of bid.legs) {
      for (const tok of leg.routeTokens) {
        if (tok.kind !== "location") continue;
        if (seen.has(tok.code)) continue;
        seen.add(tok.code);
        codes.push(tok.code);
      }
    }
    if (codes.length < 2) return;
    draft.clear();
    for (const c of codes) draft.addDirectory(c);
    navigate("/?tab=locations");
  };

  return (
    <li className="card overflow-hidden transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <div className="shrink-0 w-20">
          <div className="font-mono font-extrabold text-amber-300 text-lg tabular">
            {bid.jobNum}
          </div>
          <div
            className="text-[11px] tabular"
            style={{ color: "rgb(var(--fg-faint))" }}
          >
            #{bid.bidNum}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[13px] font-medium truncate"
            style={{ color: "rgb(var(--fg))" }}
          >
            {bid.qualifications}
          </div>
          <div
            className="text-[11px] mt-0.5 truncate"
            style={{ color: "rgb(var(--fg-subtle))" }}
          >
            {bid.destinations.slice(0, 5).join(" → ")}
            {bid.destinations.length > 5 ? "…" : ""}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div
            className="flex items-center gap-1 text-[12px] tabular"
            style={{ color: "rgb(var(--fg))" }}
          >
            <Clock
              className="w-3 h-3"
              style={{ color: "rgb(var(--fg-faint))" }}
            />
            {bid.startTime24}
          </div>
          <div
            className="text-[10px] mt-0.5"
            style={{ color: "rgb(var(--fg-faint))" }}
          >
            {bid.daysPerWeek}d/wk
          </div>
        </div>
        <ChevronRight
          className={`w-4 h-4 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
          style={{ color: "rgb(var(--fg-faint))" }}
        />
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 pt-1 border-t"
          style={{ borderColor: "rgb(var(--border) / 0.08)" }}
        >
          {takenBy && (
            <div
              className="text-[11px] mb-3 flex items-center gap-2 rounded-lg px-3 py-2"
              style={{
                background: "rgb(16 185 129 / 0.08)",
                border: "1px solid rgb(16 185 129 / 0.3)",
              }}
            >
              <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px]">
                Held by
              </span>
              <span style={{ color: "rgb(var(--fg))" }}>
                {takenBy}
                {takerRosterRow && (
                  <span
                    className="ml-1 tabular"
                    style={{ color: "rgb(var(--fg-faint))" }}
                  >
                    · #{takerRosterRow.rank}
                  </span>
                )}
              </span>
            </div>
          )}

          <ul className="space-y-2 mb-3">
            {bid.legs.map((leg, i) => (
              <li
                key={i}
                className="rounded-lg p-3"
                style={{
                  background: "rgb(var(--bg-raised) / 0.3)",
                  border: "1px solid rgb(var(--border) / 0.06)",
                }}
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <Calendar
                    className="w-3 h-3 shrink-0"
                    style={{ color: "rgb(var(--fg-faint))" }}
                  />
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: "rgb(var(--fg))" }}
                  >
                    {leg.daysRaw || "—"}
                  </span>
                  {leg.startTimeOverride24 && (
                    <span className="text-[11px] text-amber-300 tabular">
                      starts {leg.startTimeOverride24}
                    </span>
                  )}
                  {leg.qualOverride && (
                    <span className="text-[11px] text-amber-300/90">
                      {leg.qualOverride}
                    </span>
                  )}
                  <span className="ml-auto text-[11px] tabular text-amber-300">
                    {leg.hours != null
                      ? `${leg.hours}h`
                      : leg.miles != null
                        ? `${leg.miles} mi`
                        : ""}
                  </span>
                </div>
                <div
                  className="text-[12px] mt-1 font-mono"
                  style={{ color: "rgb(var(--fg-subtle))" }}
                >
                  {leg.routeTokens
                    .filter((t) => t.kind === "location")
                    .map((t) => (t as { code: string }).code)
                    .join(" → ")}
                </div>
                {leg.payNote && (
                  <div
                    className="text-[10px] mt-1 italic"
                    style={{ color: "rgb(var(--fg-faint))" }}
                  >
                    {leg.payNote}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={loadIntoRoute}
            className="btn btn-primary w-full justify-center"
          >
            <Map className="w-4 h-4" />
            Map this route
          </button>
        </div>
      )}
    </li>
  );
}
