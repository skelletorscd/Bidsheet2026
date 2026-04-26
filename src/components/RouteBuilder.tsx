import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Coffee,
  ExternalLink,
  Fuel,
  MapPin,
  Navigation,
  Plus,
  Route,
  Search,
  Trash2,
  Truck,
  Utensils,
  X,
} from "lucide-react";
import { DIRECTORY, DirectoryRow } from "../data/directory.generated";
import { ALL_BIDS, SnapshotBid } from "../data/roster";
import { Leg } from "../types";
import { RouteStop as Stop, useRouteDraft } from "../data/useRouteDraft";

const DIRECTORY_BY_CODE: Record<string, DirectoryRow> = Object.fromEntries(
  DIRECTORY.map((r) => [r.code, r]),
);

export type { Stop };

export function RouteBuilder() {
  const draft = useRouteDraft();
  // Default to custom mode + open when the draft already has stops (so that
  // an 'Add to route' tap on a card opens straight to the list).
  const [open, setOpen] = useState(draft.stops.length > 0);
  const [mode, setMode] = useState<"bid" | "custom">(
    draft.stops.length > 0 ? "custom" : "bid",
  );
  useEffect(() => {
    if (draft.stops.length > 0 && !open) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.stops.length]);

  return (
    <section className="card p-4 sm:p-5 mb-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/30 to-fuchsia-400/30 border border-amber-400/40 flex items-center justify-center shrink-0">
          <Route className="w-5 h-5 text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[11px] uppercase tracking-[0.3em] font-bold"
            style={{ color: "rgb(var(--fg-faint))" }}
          >
            Trip planner
          </div>
          <div
            className="font-semibold text-[15px] tracking-tight"
            style={{ color: "rgb(var(--fg))" }}
          >
            Build a route · open in Google Maps
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "rgb(var(--fg-faint))" }}
        />
      </button>

      {open && (
        <div
          className="mt-4 pt-4 border-t"
          style={{ borderColor: "rgb(var(--border) / 0.1)" }}
        >
          <div className="flex gap-1.5 mb-4">
            <ModeTab
              active={mode === "bid"}
              onClick={() => setMode("bid")}
              icon={Truck}
              label="From a bid"
            />
            <ModeTab
              active={mode === "custom"}
              onClick={() => setMode("custom")}
              icon={MapPin}
              label="Custom"
            />
          </div>

          {mode === "bid" ? <BidRouteMode /> : <CustomRouteMode />}
        </div>
      )}
    </section>
  );
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
        active ? "bg-amber-500/20 text-amber-200" : ""
      }`}
      style={{
        border: active
          ? "1px solid rgb(245 158 11 / 0.4)"
          : "1px solid rgb(var(--border) / 0.1)",
        color: active ? undefined : "rgb(var(--fg-subtle))",
        background: active ? undefined : "rgb(var(--bg-raised) / 0.3)",
      }}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ─── From-a-bid mode ───────────────────────────────────────────────────

function BidRouteMode() {
  const bids = useMemo(
    () => [...ALL_BIDS].sort((a, b) => a.jobNum.localeCompare(b.jobNum)),
    [],
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SnapshotBid | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bids.slice(0, 12);
    return bids
      .filter(
        (b) =>
          b.jobNum.toLowerCase().includes(q) ||
          b.legs.some((l) => l.routeRaw.toLowerCase().includes(q)),
      )
      .slice(0, 24);
  }, [bids, search]);

  return (
    <>
      <div className="relative mb-3">
        <Search
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "rgb(var(--fg-faint))" }}
        />
        <input
          className="input w-full pl-10"
          placeholder="Search bid (WP01, TLOR, COL5…) or a location code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!selected ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-72 overflow-y-auto">
          {filtered.map((b) => (
            <li key={`${b.hub}-${b.bidNum}-${b.jobNum}`}>
              <button
                type="button"
                onClick={() => setSelected(b)}
                className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                style={{
                  background: "rgb(var(--bg-raised) / 0.3)",
                  border: "1px solid rgb(var(--border) / 0.08)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-amber-300 text-[13px]">
                    {b.jobNum}
                  </span>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: "rgb(var(--fg-faint))" }}
                  >
                    {b.hub === "TOL"
                      ? "TOL"
                      : b.hub === "NBL"
                        ? "NBL"
                        : "Sleep"}
                  </span>
                </div>
                <div
                  className="text-[11px] truncate mt-0.5"
                  style={{ color: "rgb(var(--fg-subtle))" }}
                >
                  {b.destinations.slice(0, 4).join(" → ")}
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li
              className="col-span-full text-center text-sm py-4"
              style={{ color: "rgb(var(--fg-faint))" }}
            >
              No bids match.
            </li>
          )}
        </ul>
      ) : (
        <BidDetails bid={selected} onBack={() => setSelected(null)} />
      )}
    </>
  );
}

function BidDetails({
  bid,
  onBack,
}: {
  bid: SnapshotBid;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-mono font-bold text-xl text-amber-300">
            {bid.jobNum}
            <span
              className="ml-2 text-[11px] font-medium tracking-widest uppercase"
              style={{ color: "rgb(var(--fg-faint))" }}
            >
              {bid.hub === "TOL"
                ? "Toledo"
                : bid.hub === "NBL"
                  ? "N. Baltimore"
                  : "Sleeper"}
            </span>
          </div>
          <div
            className="text-[12px] mt-0.5"
            style={{ color: "rgb(var(--fg-subtle))" }}
          >
            Start {bid.startTime24} · {bid.qualifications}
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="btn text-[12px]"
          aria-label="Back to bid list"
        >
          <X className="w-3.5 h-3.5" />
          Change
        </button>
      </div>

      <p
        className="text-[12px]"
        style={{ color: "rgb(var(--fg-subtle))" }}
      >
        Each line is one day's driving pattern. Tap "Open in Maps" to get
        turn-by-turn directions with every stop.
      </p>

      <ul className="space-y-2">
        {bid.legs.map((leg, i) => {
          const codes = locationCodesFromLeg(leg);
          if (codes.length < 2) return null;
          const stops: Stop[] = codes.map((code) => ({ kind: "directory", code }));
          return (
            <li
              key={i}
              className="rounded-xl p-3"
              style={{
                background: "rgb(var(--bg-raised) / 0.3)",
                border: "1px solid rgb(var(--border) / 0.08)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: "rgb(var(--fg-faint))" }}
                  >
                    {leg.daysRaw || "—"}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {codes.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[12px]"
                      >
                        <span className="font-mono font-semibold text-amber-300">
                          {c}
                        </span>
                        {idx < codes.length - 1 && (
                          <ChevronRight
                            className="w-3 h-3"
                            style={{ color: "rgb(var(--fg-faint))" }}
                          />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <a
                  href={googleMapsUrl(stops)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary text-[12px] shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Open in Maps
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function locationCodesFromLeg(leg: Leg): string[] {
  const out: string[] = [];
  for (const tok of leg.routeTokens) {
    if (tok.kind === "location") out.push(tok.code);
  }
  return out;
}

// ─── Custom mode ───────────────────────────────────────────────────────

function CustomRouteMode() {
  const draft = useRouteDraft();
  const stops = draft.stops;
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    const taken = new Set(
      stops.filter((s) => s.kind === "directory").map((s) => (s as { code: string }).code),
    );
    const pool = DIRECTORY.filter((r) => !taken.has(r.code));
    if (!q) return pool.slice(0, 10);
    return pool
      .filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          (r.state ?? "").toLowerCase().includes(q) ||
          (r.address ?? "").toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [stops, search]);

  const addDirectory = (code: string) => {
    draft.addDirectory(code);
    setSearch("");
  };
  const addCustom = (address: string, label?: string) => {
    draft.addCustom(address, label);
    setCustomInput("");
  };
  const addPitStop = (kind: "gas" | "food" | "rest") => {
    const q =
      kind === "gas"
        ? prompt("Paste the gas station address (or name + city):")
        : kind === "food"
          ? prompt("Paste the restaurant / food stop address (or name + city):")
          : prompt("Paste the rest-area / pit-stop address (or name + city):");
    if (!q) return;
    const label =
      (kind === "gas" ? "⛽ " : kind === "food" ? "🍔 " : "🛑 ") + q.trim();
    addCustom(q, label);
  };
  const remove = draft.remove;
  const move = draft.move;

  const customCount = stops.filter((s) => s.kind === "custom").length;

  return (
    <div className="space-y-3">
      {stops.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div
              className="text-[10px] uppercase tracking-[0.3em] font-bold flex items-center gap-1.5"
              style={{ color: "rgb(var(--fg-faint))" }}
            >
              <Route className="w-3 h-3 text-amber-300" />
              Today's route · {stops.length} stop{stops.length === 1 ? "" : "s"}
            </div>
            <button
              type="button"
              className="text-[11px] hover:text-rose-300 transition-colors"
              style={{ color: "rgb(var(--fg-faint))" }}
              onClick={() => draft.clear()}
            >
              Clear
            </button>
          </div>
          <ol className="space-y-0">
            {stops.map((stop, i) => {
              const isCustom = stop.kind === "custom";
              const directoryRow =
                stop.kind === "directory"
                  ? DIRECTORY_BY_CODE[stop.code]
                  : null;
              const last = i === stops.length - 1;
              const broken = !isRoutable(stop);
              return (
                <li key={i}>
                  <div
                    className="rounded-2xl p-3 flex items-center gap-3 relative"
                    style={{
                      background: broken
                        ? "linear-gradient(135deg, rgb(244 63 94 / 0.18), rgb(244 63 94 / 0.05))"
                        : isCustom
                          ? "linear-gradient(135deg, rgb(168 85 247 / 0.18), rgb(168 85 247 / 0.05))"
                          : "linear-gradient(135deg, rgb(245 158 11 / 0.14), rgb(var(--bg-raised) / 0.3))",
                      border: broken
                        ? "1px solid rgb(244 63 94 / 0.5)"
                        : isCustom
                          ? "1px solid rgb(168 85 247 / 0.4)"
                          : "1px solid rgb(245 158 11 / 0.3)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold tabular text-base shrink-0"
                      style={{
                        background: isCustom
                          ? "rgb(168 85 247 / 0.35)"
                          : "rgb(245 158 11 / 0.35)",
                        color: isCustom
                          ? "rgb(233 213 255)"
                          : "rgb(252 211 77)",
                        border: isCustom
                          ? "1px solid rgb(168 85 247 / 0.5)"
                          : "1px solid rgb(245 158 11 / 0.55)",
                        boxShadow: isCustom
                          ? "0 0 18px rgb(168 85 247 / 0.4)"
                          : "0 0 18px rgb(245 158 11 / 0.4)",
                      }}
                    >
                      {i + 1}
                    </div>

                    {isCustom ? (
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[14px] truncate font-semibold"
                          style={{ color: "rgb(var(--fg))" }}
                        >
                          {(stop as { label: string }).label}
                        </div>
                        <div
                          className="text-[11px] truncate"
                          style={{ color: "rgb(var(--fg-subtle))" }}
                        >
                          {(stop as { address: string }).address}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-amber-300 text-[15px]">
                            {(stop as { code: string }).code}
                          </span>
                          <span
                            className="text-[14px] truncate"
                            style={{ color: "rgb(var(--fg))" }}
                          >
                            {directoryRow?.city}
                            {directoryRow?.state
                              ? `, ${directoryRow.state}`
                              : ""}
                          </span>
                        </div>
                        {directoryRow?.address ? (
                          <div
                            className="text-[11px] truncate"
                            style={{ color: "rgb(var(--fg-subtle))" }}
                          >
                            {directoryRow.address}
                          </div>
                        ) : (
                          <div
                            className="text-[11px] truncate flex items-center gap-1 text-rose-300"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            No address on file — Maps can't route here. Remove
                            or use a custom address.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      <IconChip
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        label="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </IconChip>
                      <IconChip
                        onClick={() => move(i, 1)}
                        disabled={i === stops.length - 1}
                        label="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </IconChip>
                      <IconChip onClick={() => remove(i)} label="Remove">
                        <Trash2 className="w-4 h-4" />
                      </IconChip>
                    </div>
                  </div>
                  {!last && (
                    <div className="flex justify-center py-1">
                      <ChevronDown
                        className="w-5 h-5"
                        style={{ color: "rgb(245 158 11 / 0.6)" }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* UPS directory search */}
      <div>
        <div
          className="text-[10px] uppercase tracking-wider font-semibold mb-1.5"
          style={{ color: "rgb(var(--fg-faint))" }}
        >
          Add a UPS stop
        </div>
        <div className="relative">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "rgb(var(--fg-faint))" }}
          />
          <input
            className="input w-full pl-10"
            placeholder="Search a location code or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto mt-1.5">
            {options.map((r) => (
              <li key={`${r.code}-${r.slic ?? ""}`}>
                <button
                  type="button"
                  onClick={() => addDirectory(r.code)}
                  className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  style={{
                    background: "rgb(var(--bg-raised) / 0.3)",
                    border: "1px solid rgb(var(--border) / 0.08)",
                  }}
                >
                  <Plus
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: "rgb(var(--fg-faint))" }}
                  />
                  <span className="font-mono font-semibold text-amber-300 text-[12px]">
                    {r.code}
                  </span>
                  <span
                    className="flex-1 text-[12px] truncate"
                    style={{ color: "rgb(var(--fg-subtle))" }}
                  >
                    {r.city}
                    {r.state ? `, ${r.state}` : ""}
                  </span>
                </button>
              </li>
            ))}
            {options.length === 0 && (
              <li
                className="col-span-full text-[12px] text-center py-2"
                style={{ color: "rgb(var(--fg-faint))" }}
              >
                No match.
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Custom address */}
      <div>
        <div
          className="text-[10px] uppercase tracking-wider font-semibold mb-1.5"
          style={{ color: "rgb(var(--fg-faint))" }}
        >
          Add a custom address
        </div>
        <div className="flex gap-1.5">
          <input
            className="input flex-1"
            placeholder="Paste any address, or 'Home', 'Brother's house', etc."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customInput.trim()) addCustom(customInput);
            }}
          />
          <button
            type="button"
            className="btn"
            onClick={() => addCustom(customInput)}
            disabled={!customInput.trim()}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Pit stops */}
      <div>
        <div
          className="text-[10px] uppercase tracking-wider font-semibold mb-1.5"
          style={{ color: "rgb(var(--fg-faint))" }}
        >
          Add a pit stop
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="btn text-[12px]"
            onClick={() => addPitStop("gas")}
          >
            <Fuel className="w-3.5 h-3.5" />
            Gas
          </button>
          <button
            type="button"
            className="btn text-[12px]"
            onClick={() => addPitStop("food")}
          >
            <Utensils className="w-3.5 h-3.5" />
            Food
          </button>
          <button
            type="button"
            className="btn text-[12px]"
            onClick={() => addPitStop("rest")}
          >
            <Coffee className="w-3.5 h-3.5" />
            Rest area
          </button>
        </div>
        {customCount > 0 && (
          <div
            className="mt-2 flex items-start gap-2 text-[11px] px-2.5 py-1.5 rounded-lg"
            style={{
              background: "rgb(var(--bg-raised) / 0.25)",
              border: "1px solid rgb(var(--border) / 0.08)",
              color: "rgb(var(--fg-subtle))",
            }}
          >
            <AlertCircle
              className="w-3 h-3 mt-0.5 shrink-0 text-amber-300"
            />
            <span>
              Proximity alerts during the drive come from Google Maps itself —
              once the route opens, you'll get "in 2 miles, {""}
              <span className="italic">your stop</span>" voice prompts for every
              waypoint automatically. Web browsers can't do that reliably when
              your phone's locked.
            </span>
          </div>
        )}
      </div>

      {(() => {
        const validCount = stops.filter(isRoutable).length;
        const brokenCount = stops.length - validCount;
        if (stops.length < 2) {
          return (
            <p
              className="text-[11px] italic pt-1"
              style={{ color: "rgb(var(--fg-faint))" }}
            >
              Add at least two stops to build a route.
            </p>
          );
        }
        return (
          <div className="space-y-2">
            {brokenCount > 0 && (
              <div className="flex items-start gap-2 text-[12px] text-rose-200 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  {brokenCount} stop{brokenCount === 1 ? "" : "s"} can't be
                  routed (no address on file). Maps will skip{" "}
                  {brokenCount === 1 ? "it" : "them"} unless you remove or
                  replace with a custom address.
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div
                className="text-[12px]"
                style={{ color: "rgb(var(--fg-subtle))" }}
              >
                {validCount} routable / {stops.length} total ·{" "}
                <button
                  type="button"
                  className="hover:text-amber-300 underline-offset-2 hover:underline"
                  onClick={() => draft.clear()}
                >
                  clear all
                </button>
              </div>
              <a
                href={googleMapsUrl(stops)}
                target="_blank"
                rel="noreferrer"
                className={`btn btn-primary ${
                  validCount < 2 ? "pointer-events-none opacity-40" : ""
                }`}
                aria-disabled={validCount < 2}
              >
                <Navigation className="w-4 h-4" />
                Open in Google Maps
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function IconChip({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
      style={{
        background: "rgb(var(--bg-hover) / 0.4)",
        color: "rgb(var(--fg-muted))",
      }}
    >
      {children}
    </button>
  );
}

// ─── Google Maps deep link ─────────────────────────────────────────────

/** True if this stop has enough info for Google Maps to route to it
 *  (a real street address OR lat/lng). City-only fallbacks break the
 *  whole route in Google's URL format, so we skip those. */
export function isRoutable(stop: Stop): boolean {
  if (stop.kind === "custom") return stop.address.trim().length > 0;
  const row = DIRECTORY_BY_CODE[stop.code];
  if (!row) return false;
  if (row.address && row.address.trim().length > 0) return true;
  if (row.lat != null && row.lng != null) return true;
  return false;
}

/**
 * Builds a Google Maps directions URL containing every routable stop in
 * order. Stops missing an address AND coordinates are silently dropped
 * (the UI flags them so the driver can fix or remove them). Capped at
 * 20 stops to stay under Google's web Maps limit.
 */
export function googleMapsUrl(stops: Stop[]): string {
  const tokens: string[] = [];
  for (const s of stops) {
    if (!isRoutable(s)) continue;
    if (s.kind === "custom") {
      tokens.push(encodeURIComponent(s.address));
      continue;
    }
    const row = DIRECTORY_BY_CODE[s.code];
    if (row?.address) {
      tokens.push(encodeURIComponent(row.address));
    } else if (row?.lat != null && row?.lng != null) {
      tokens.push(`${row.lat},${row.lng}`);
    }
    if (tokens.length >= 20) break;
  }
  if (tokens.length < 2) return "https://www.google.com/maps";
  return `https://www.google.com/maps/dir/${tokens.join("/")}`;
}

/** Returns codes of stops that aren't routable, so the UI can highlight
 *  them. Custom stops are always considered routable as long as they
 *  have a non-empty address. */
export function unrouteableStops(stops: Stop[]): number[] {
  const out: number[] = [];
  stops.forEach((s, i) => {
    if (!isRoutable(s)) out.push(i);
  });
  return out;
}
