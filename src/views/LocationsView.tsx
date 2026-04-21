import { useEffect, useMemo, useState } from "react";
import { Building2, Navigation, Phone, Plane, Search, TrafficCone } from "lucide-react";
import {
  DIRECTORY,
  mapsDirectionsUrl,
  mapsUrl,
} from "../data/locations";
import { DirectoryCategory, DirectoryRow } from "../data/directory.generated";

type Props = {
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
};

const CATEGORY_ORDER: DirectoryCategory[] = ["center", "airport", "toll"];

const CATEGORY_LABEL: Record<DirectoryCategory, string> = {
  center: "UPS Centers",
  airport: "Airports",
  toll: "Toll Plazas",
};

const CATEGORY_ICON: Record<
  DirectoryCategory,
  React.ComponentType<{ className?: string }>
> = {
  center: Building2,
  airport: Plane,
  toll: TrafficCone,
};

export function LocationsView({ onStatus }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DirectoryCategory | "all">("all");

  useEffect(() => {
    // Directory is baked into the bundle — always fresh.
    onStatus({
      fetchedAt: Date.now(),
      loading: false,
      error: null,
      source: "bundled",
    });
  }, [onStatus]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DIRECTORY.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        (r.state ?? "").toLowerCase().includes(q) ||
        (r.slic ?? "").toLowerCase().includes(q) ||
        (r.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  const grouped = useMemo(() => {
    const out: Record<DirectoryCategory, DirectoryRow[]> = {
      center: [],
      airport: [],
      toll: [],
    };
    for (const r of filtered) out[r.category].push(r);
    for (const cat of CATEGORY_ORDER) {
      out[cat].sort((a, b) => {
        const sa = (a.state ?? "") + a.city;
        const sb = (b.state ?? "") + b.city;
        return sa.localeCompare(sb);
      });
    }
    return out;
  }, [filtered]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              Location directory
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {DIRECTORY.length} facilities — tap an address for turn-by-turn
              GPS.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="input pl-8 w-48 sm:w-56"
                placeholder="Search city, code, SLIC…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <FilterPill
            active={category === "all"}
            onClick={() => setCategory("all")}
          >
            All ({DIRECTORY.length})
          </FilterPill>
          {CATEGORY_ORDER.map((cat) => {
            const Icon = CATEGORY_ICON[cat];
            const count = DIRECTORY.filter((r) => r.category === cat).length;
            return (
              <FilterPill
                key={cat}
                active={category === cat}
                onClick={() => setCategory(cat)}
              >
                <Icon className="w-3.5 h-3.5" />
                {CATEGORY_LABEL[cat]} ({count})
              </FilterPill>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="card p-8 text-center text-slate-400">
            No locations match your search.
          </div>
        )}

        {CATEGORY_ORDER.map((cat) => {
          const rows = grouped[cat];
          if (rows.length === 0) return null;
          const Icon = CATEGORY_ICON[cat];
          return (
            <section key={cat} className="mb-6">
              <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {CATEGORY_LABEL[cat]} · {rows.length}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {rows.map((r) => (
                  <LocationCard key={r.code} row={r} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium border transition-colors ${
        active
          ? "bg-amber-500/15 text-amber-200 border-amber-500/40"
          : "border-border text-slate-300 hover:bg-bg-hover"
      }`}
    >
      {children}
    </button>
  );
}

function LocationCard({ row }: { row: DirectoryRow }) {
  const cityLabel = row.state ? `${row.city}, ${row.state}` : row.city;
  const directions = row.address
    ? mapsDirectionsUrl(row.address, cityLabel)
    : null;
  const search = mapsUrl({
    name: cityLabel,
    confirmed: true,
    address: row.address ?? undefined,
  });

  return (
    <div className="card p-3 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 items-start">
          <span className="font-mono text-[12px] font-semibold tabular bg-slate-800/60 text-slate-200 px-2 py-0.5 rounded">
            {row.code}
          </span>
          {row.slic && (
            <span className="text-[10px] text-slate-500 tabular">
              SLIC {row.slic}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-100 truncate">
            {cityLabel}
          </div>
          {row.address ? (
            <a
              href={directions!}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-sky-300 hover:text-sky-200 hover:underline leading-snug block mt-0.5"
            >
              {row.address}
            </a>
          ) : (
            <a
              href={search}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-slate-500 hover:underline leading-snug block mt-0.5"
            >
              No address on file — search on Maps
            </a>
          )}
          {row.phone && (
            <a
              href={`tel:${row.phone.replace(/[^\d+]/g, "")}`}
              className="text-[11px] text-emerald-300 hover:underline mt-1 inline-flex items-center gap-1 tabular"
            >
              <Phone className="w-3 h-3" />
              {row.phone}
            </a>
          )}
          {row.notes && (
            <div className="text-[11px] text-amber-300/80 mt-1 italic">
              {row.notes}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-1.5">
        {directions && (
          <a
            href={directions}
            target="_blank"
            rel="noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-sky-500/15 text-sky-200 border border-sky-500/30 text-[12px] font-medium hover:bg-sky-500/25"
          >
            <Navigation className="w-3.5 h-3.5" />
            Start GPS
          </a>
        )}
      </div>
    </div>
  );
}
