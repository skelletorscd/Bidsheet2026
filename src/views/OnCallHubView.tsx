import { useEffect, useMemo, useState } from "react";
import { Phone, Search, X } from "lucide-react";
import { parseOnCallCsv } from "../parse/people";
import { SNAPSHOT_CSV } from "../data/snapshots";
import { TabSource } from "../data/sources";

type Props = {
  tab: TabSource;
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
};

export function OnCallHubView({ tab, onStatus }: Props) {
  useEffect(() => {
    onStatus({
      fetchedAt: Date.now(),
      loading: false,
      error: null,
      source: "snapshot",
    });
  }, [onStatus]);

  const csv =
    tab.hub === "TOL"
      ? SNAPSHOT_CSV.onCallToledo
      : SNAPSHOT_CSV.onCallNbloh;
  const parsed = parseOnCallCsv(csv);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parsed.rows;
    return parsed.rows.filter(
      (r) =>
        String(r.position).includes(q) ||
        (r.driver ?? "").toLowerCase().includes(q),
    );
  }, [parsed.rows, search]);

  const filled = parsed.rows.filter((r) => r.driver).length;
  const hubLabel = tab.hub === "TOL" ? "Toledo" : "North Baltimore";
  const accent = tab.hub === "TOL" ? "amber" : "emerald";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* Hero */}
        <section
          className={`relative overflow-hidden rounded-2xl border ${accent === "amber" ? "border-amber-500/30 from-amber-500/15" : "border-emerald-500/30 from-emerald-500/15"} bg-gradient-to-br via-bg-panel to-bg-base p-5 sm:p-6 mb-4`}
        >
          <div
            className={`absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-25 pointer-events-none`}
            style={{
              background: `radial-gradient(closest-side, ${accent === "amber" ? "rgba(245,158,11,0.7)" : "rgba(16,185,129,0.7)"}, transparent 70%)`,
              animation: "pulseDot 4s ease-in-out infinite",
            }}
          />
          <div className="relative flex items-center gap-4">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${accent === "amber" ? "bg-amber-500/20 border-2 border-amber-400/60" : "bg-emerald-500/20 border-2 border-emerald-400/60"} flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(245,158,11,0.3)]`}
            >
              <Phone
                className={`w-6 h-6 sm:w-7 sm:h-7 ${accent === "amber" ? "text-amber-300" : "text-emerald-300"}`}
              />
            </div>
            <div className="min-w-0">
              <div
                className={`text-[10px] uppercase tracking-[0.35em] font-bold ${accent === "amber" ? "text-amber-300/80" : "text-emerald-300/80"}`}
              >
                On-call board
              </div>
              <h1 className="mt-0.5 font-extrabold text-2xl sm:text-4xl text-slate-50 tracking-tight leading-tight">
                {hubLabel}
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                <span
                  className={`font-bold ${accent === "amber" ? "text-amber-200" : "text-emerald-200"}`}
                >
                  {filled}
                </span>{" "}
                filled · {parsed.rows.length - filled} vacant ·{" "}
                {parsed.rows.length} slots total
              </p>
            </div>
          </div>
        </section>

        {parsed.notice && (
          <div className="card p-3 mb-4 border-amber-500/30 bg-amber-500/5">
            <p className="text-[12px] text-amber-200/90 leading-relaxed">
              {parsed.notice}
            </p>
          </div>
        )}

        {/* Prominent search */}
        <div className="relative mb-4">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            className="w-full bg-bg-panel border border-border rounded-xl pl-11 pr-10 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
            placeholder="Search name or position…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:bg-bg-hover"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-400">
            No matches.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-border-subtle">
              {filtered.map((row) => (
                <li
                  key={row.position}
                  className={`px-4 py-2.5 flex items-center gap-3 transition-colors ${row.driver ? "hover:bg-bg-hover" : "opacity-80"}`}
                >
                  <span
                    className={`tabular w-10 text-right font-semibold ${row.driver ? (accent === "amber" ? "text-amber-300" : "text-emerald-300") : "text-slate-600"}`}
                  >
                    {row.position}
                  </span>
                  {row.driver ? (
                    <span className="flex-1 text-slate-100 font-medium">
                      {row.driver}
                    </span>
                  ) : (
                    <span className="flex-1 text-slate-600 italic text-[13px]">
                      vacant
                    </span>
                  )}
                  {row.notes && (
                    <span className="text-[11px] text-slate-500">
                      {row.notes}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-slate-500 text-center mt-4">
          On-call positions are filled top-down as drivers opt in. A new
          interactive board with live status (working / reset / pass / hold
          / called-off) is coming once accounts ship.
        </p>
      </div>
    </div>
  );
}
