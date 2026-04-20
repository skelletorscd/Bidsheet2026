import { useEffect, useMemo, useState } from "react";
import { useCsv } from "../data/useCsv";
import { TabSource, csvUrl } from "../data/sources";
import { Settings } from "../data/settings";
import { parseSeniorityCsv, parseBidTimesCsv } from "../parse/people";
import { PasteFallback } from "../components/PasteFallback";
import { AlertCircle, Inbox, Search } from "lucide-react";
import {
  parseDateMDY,
  yearsSince,
  formatYears,
  formatCallWindow,
} from "../util/people";
import { useTakenBids } from "../data/useTakenBids";

type Props = {
  tab: TabSource;
  settings: Settings;
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
};

const BID_TIMES_GID = 1262154739;

export function SeniorityView({ tab, settings, onStatus }: Props) {
  const gid = settings.customGids[tab.key] ?? tab.gid ?? null;
  const csvState = useCsv(
    settings.spreadsheetId,
    gid,
    settings.refreshIntervalSec,
  );

  const bidTimesGid =
    settings.customGids["bidTimes"] ?? BID_TIMES_GID ?? null;
  const bidTimesState = useCsv(
    settings.spreadsheetId,
    bidTimesGid,
    settings.refreshIntervalSec,
  );

  useEffect(() => {
    onStatus({
      fetchedAt: csvState.fetchedAt,
      loading: csvState.loading,
      error: csvState.error,
      source: csvState.source,
    });
  }, [
    onStatus,
    csvState.fetchedAt,
    csvState.loading,
    csvState.error,
    csvState.source,
  ]);

  const seniority = useMemo(
    () => (csvState.csv ? parseSeniorityCsv(csvState.csv) : []),
    [csvState.csv],
  );

  const bidTimes = useMemo(
    () => (bidTimesState.csv ? parseBidTimesCsv(bidTimesState.csv) : []),
    [bidTimesState.csv],
  );

  const takenBids = useTakenBids(settings);

  const callTimeByRank = useMemo(() => {
    const map = new Map<number, string>();
    let lastWindow: string | null = null;
    for (const row of bidTimes) {
      if (row.callWindow) lastWindow = row.callWindow;
      if (lastWindow) map.set(row.rank, lastWindow);
    }
    return map;
  }, [bidTimes]);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return seniority;
    return seniority.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        String(r.rank).includes(q) ||
        (r.currentBid ?? "").toLowerCase().includes(q),
    );
  }, [seniority, search]);

  const pickedCount = seniority.filter(
    (r) => r.currentBid || takenBids.lookup(r.name),
  ).length;

  if (gid == null) return notConfigured(tab.label);
  if (csvState.error && !csvState.csv) {
    return (
      <div className="p-6">
        <ErrorCard error={csvState.error} />
        <PasteFallback
          url={csvUrl(settings.spreadsheetId, gid)}
          onSubmit={csvState.setPaste}
        />
      </div>
    );
  }
  if (!seniority.length && csvState.loading) return loading();
  if (!seniority.length) return empty();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              Seniority list
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {seniority.length} drivers · {pickedCount} have picked
            </p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input pl-8 w-56"
              placeholder="Search name or bid #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-raised/60 sticky top-0">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5 w-14 text-right">Rank</th>
                <th className="px-3 py-2.5">Driver</th>
                <th className="px-3 py-2.5 hidden md:table-cell">
                  Seniority date
                </th>
                <th className="px-3 py-2.5">Call window</th>
                <th className="px-3 py-2.5">Picked bid</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const callWindow = formatCallWindow(
                  callTimeByRank.get(row.rank) ?? null,
                );
                const takenMatch = takenBids.lookup(row.name);
                const pickedBid = row.currentBid ?? takenMatch?.jobNum ?? null;
                const hasPicked = !!pickedBid;
                const seniorityRaw = row.ptDate ?? row.ftDate;
                const seniorityDate = parseDateMDY(seniorityRaw);
                const yrs = yearsSince(seniorityDate);
                return (
                  <tr
                    key={row.rank}
                    className={`border-t border-border-subtle ${
                      hasPicked ? "opacity-70" : "hover:bg-bg-hover"
                    }`}
                  >
                    <td className="px-3 py-2 text-right tabular font-semibold text-amber-300">
                      {row.rank}
                    </td>
                    <td className="px-3 py-2 text-slate-100 font-medium">
                      {row.name}
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
                    <td className="px-3 py-2 text-slate-200 text-[12px] tabular whitespace-nowrap">
                      {callWindow ?? (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {hasPicked ? (
                        <span className="font-mono font-semibold text-amber-300 tabular">
                          {pickedBid}
                          {takenMatch?.hub && takenMatch.hub !== "TOL" && (
                            <span className="ml-1.5 text-[10px] text-slate-500 font-normal tracking-wider uppercase">
                              {takenMatch.hub === "NBL"
                                ? "NBL"
                                : takenMatch.hub === "ALL"
                                  ? "Sleep"
                                  : ""}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[12px]">
                          pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function loading() {
  return (
    <div className="p-8 text-center text-slate-400">
      <div className="animate-pulseDot inline-block w-2 h-2 rounded-full bg-sky-400 mr-2" />
      Loading…
    </div>
  );
}
function empty() {
  return (
    <div className="p-8 text-center text-slate-400">
      <Inbox className="w-8 h-8 mx-auto text-slate-600 mb-3" />
      No seniority data.
    </div>
  );
}
function notConfigured(label: string) {
  return (
    <div className="p-6 max-w-2xl">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold">{label}</h3>
        </div>
        <p className="text-sm text-slate-400">
          This tab needs a GID. Open Settings → Tab GIDs.
        </p>
      </div>
    </div>
  );
}
function ErrorCard({ error }: { error: string }) {
  return (
    <div className="card p-4 mb-4 border-rose-500/30">
      <div className="flex items-center gap-2 text-rose-300 text-sm">
        <AlertCircle className="w-4 h-4" />
        Couldn't load: {error}
      </div>
    </div>
  );
}
