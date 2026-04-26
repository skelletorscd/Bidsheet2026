import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ROSTER, HEADLINE_COUNTS, PickInfo } from "../data/roster";
import { parseDateMDY, yearsSince, formatYears } from "../util/people";

type Props = {
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
};

type StatusFilter = "all" | "bid" | "onCall" | "limbo" | "pending";

export function RosterView({ onStatus }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    onStatus({
      fetchedAt: Date.now(),
      loading: false,
      error: null,
      source: "snapshot",
    });
  }, [onStatus]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ROSTER.filter((r) => {
      if (status !== "all" && r.pick.kind !== status) return false;
      if (q) {
        const hay = `${r.rank} ${r.name} ${r.pick.kind === "bid" ? r.pick.jobNum : ""}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [search, status]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100">
              Roster
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {HEADLINE_COUNTS.totalDrivers} drivers ·{" "}
              <span className="text-amber-300">
                {HEADLINE_COUNTS.picked} on a bid
              </span>{" "}
              ·{" "}
              <span className="text-sky-300">
                {HEADLINE_COUNTS.onCall} on-call
              </span>
              {HEADLINE_COUNTS.limbo > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-rose-300">
                    {HEADLINE_COUNTS.limbo} unknown
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Prominent search */}
        <div className="relative mb-3">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            className="w-full bg-bg-panel border border-border rounded-xl pl-11 pr-10 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
            placeholder="Search driver, rank, job #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
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

        {/* Status filter pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <FilterPill active={status === "all"} onClick={() => setStatus("all")}>
            All ({HEADLINE_COUNTS.totalDrivers})
          </FilterPill>
          <FilterPill active={status === "bid"} onClick={() => setStatus("bid")}>
            On a bid ({HEADLINE_COUNTS.picked})
          </FilterPill>
          <FilterPill
            active={status === "onCall"}
            onClick={() => setStatus("onCall")}
          >
            On-call ({HEADLINE_COUNTS.onCall})
          </FilterPill>
          {HEADLINE_COUNTS.limbo > 0 && (
            <FilterPill
              active={status === "limbo"}
              onClick={() => setStatus("limbo")}
            >
              Unknown ({HEADLINE_COUNTS.limbo})
            </FilterPill>
          )}
          <FilterPill
            active={status === "pending"}
            onClick={() => setStatus("pending")}
          >
            Pending ({HEADLINE_COUNTS.pending})
          </FilterPill>
        </div>

        {/* List */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-raised/60 sticky top-0">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5 w-14 text-right">Rank</th>
                <th className="px-3 py-2.5">Driver</th>
                <th className="px-3 py-2.5 hidden md:table-cell">
                  Seniority date
                </th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const seniorityRaw = r.ptDate ?? r.ftDate;
                const seniorityDate = parseDateMDY(seniorityRaw);
                const yrs = yearsSince(seniorityDate);
                const rowTint = rowTintFor(r.pick);
                return (
                  <tr
                    key={r.rank}
                    className={`border-t border-border-subtle transition-colors ${rowTint}`}
                  >
                    <td
                      className={`px-3 py-2 text-right tabular font-semibold ${r.pick.kind === "bid" ? "text-emerald-300" : r.pick.kind === "onCall" ? "text-sky-300" : "text-amber-300"}`}
                    >
                      {r.rank}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-100">
                      {r.name}
                    </td>
                    <td className="px-3 py-2 text-slate-300 hidden md:table-cell whitespace-nowrap">
                      {seniorityRaw ? (
                        <>
                          <span className="tabular">{seniorityRaw}</span>
                          {seniorityDate && (
                            <span className="text-slate-500 ml-2 text-[12px]">
                              "{formatYears(yrs)}"
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <PickBadge pick={r.pick} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              No drivers match.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-amber-500/20 border-amber-500/50 text-amber-200 font-semibold"
          : "border-border text-slate-300 hover:bg-bg-hover"
      }`}
    >
      {children}
    </button>
  );
}

function rowTintFor(pick: PickInfo): string {
  switch (pick.kind) {
    case "bid":
      return "bg-emerald-500/[0.05] hover:bg-emerald-500/10";
    case "onCall":
      return "bg-sky-500/[0.05] hover:bg-sky-500/10";
    case "limbo":
      return "bg-rose-500/[0.05] hover:bg-rose-500/10";
    default:
      return "hover:bg-bg-hover";
  }
}

function PickBadge({ pick }: { pick: PickInfo }) {
  switch (pick.kind) {
    case "bid":
      return (
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-amber-300 tabular">
            {pick.jobNum}
          </span>
          {pick.hub !== "TOL" && (
            <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">
              {pick.hub === "NBL" ? "NBL" : pick.hub === "ALL" ? "Sleep" : ""}
            </span>
          )}
          {pick.coTakers.length > 0 && (
            <span className="text-[10px] text-slate-500">
              w/ {pick.coTakers[0]}
            </span>
          )}
        </div>
      );
    case "onCall":
      return (
        <span className="font-mono font-bold text-sky-300 tabular text-[13px]">
          ON-CALL{" "}
          <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">
            {pick.hub}
          </span>{" "}
          <span className="text-[10px] text-slate-500 font-normal">
            #{pick.position}
          </span>
        </span>
      );
    case "limbo":
      return (
        <span className="font-semibold text-rose-300 text-[12px] uppercase tracking-wider">
          Unknown
        </span>
      );
    default:
      return (
        <span className="text-slate-600 text-[12px] italic">pending</span>
      );
  }
}
