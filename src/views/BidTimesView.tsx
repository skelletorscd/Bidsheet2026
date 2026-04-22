import { useEffect, useMemo } from "react";
import { useCsv } from "../data/useCsv";
import { TabSource, csvUrl } from "../data/sources";
import { Settings } from "../data/settings";
import { parseBidTimesCsv, BidTimesRow } from "../parse/people";
import { PasteFallback } from "../components/PasteFallback";
import { AlertCircle, Calendar, Inbox } from "lucide-react";
import { formatCallWindow } from "../util/people";
import { useTakenBids, ON_CALL_JOB_NUM } from "../data/useTakenBids";

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

export function BidTimesView({ tab, settings, onStatus }: Props) {
  const gid = settings.customGids[tab.key] ?? tab.gid ?? null;
  const csvState = useCsv(
    settings.spreadsheetId,
    gid,
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

  const rows = useMemo(
    () => (csvState.csv ? parseBidTimesCsv(csvState.csv) : []),
    [csvState.csv],
  );

  const takenBids = useTakenBids(settings);

  const grouped = useMemo(() => groupByWindow(rows), [rows]);

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
  if (!rows.length && csvState.loading) return loading();
  if (!rows.length) return empty();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-slate-100">
            Bid call schedule
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {rows.length} drivers grouped into {grouped.length} call windows
          </p>
        </div>

        <div className="space-y-4">
          {grouped.map((g, i) => (
            <section key={i} className="card overflow-hidden">
              <header className="px-4 py-3 bg-bg-raised/60 border-b border-border-subtle flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-slate-100 tabular">
                    {g.window
                      ? (formatCallWindow(g.window) ?? g.window)
                      : "Unscheduled"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 tabular">
                  Rank {g.rows[0].rank}–{g.rows[g.rows.length - 1].rank} ·{" "}
                  {g.rows.length} drivers
                </span>
              </header>
              <ul className="divide-y divide-border-subtle">
                {g.rows.map((r) => {
                  const picked = takenBids.lookup(r.name);
                  return (
                    <li
                      key={r.rank}
                      className={`px-4 py-2 flex items-center gap-3 transition-colors ${
                        picked
                          ? "bg-emerald-500/[0.06] hover:bg-emerald-500/10"
                          : "hover:bg-bg-hover"
                      }`}
                    >
                      <span
                        className={`tabular w-10 text-right font-semibold ${picked ? "text-emerald-300" : "text-amber-300"}`}
                      >
                        {r.rank}
                      </span>
                      <span
                        className={`flex-1 font-medium ${picked ? "text-emerald-200" : "text-slate-100"}`}
                      >
                        {r.name}
                      </span>
                      {picked ? (
                        picked.jobNum === ON_CALL_JOB_NUM ? (
                          <span className="font-mono text-[12px] font-semibold text-sky-300 tabular">
                            ON-CALL
                            {picked.hub && (
                              <span className="ml-1 text-[10px] text-slate-500 font-normal tracking-wider uppercase">
                                {picked.hub === "NBL" ? "NBL" : "TOL"}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="font-mono text-[12px] font-semibold text-amber-300 tabular">
                            {picked.jobNum}
                            {picked.hub && picked.hub !== "TOL" && (
                              <span className="ml-1 text-[10px] text-slate-500 font-normal tracking-wider uppercase">
                                {picked.hub === "NBL"
                                  ? "NBL"
                                  : picked.hub === "ALL"
                                    ? "Sleep"
                                    : ""}
                              </span>
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-600">
                          pending
                        </span>
                      )}
                      {r.vacationWeeks && (
                        <span className="text-[11px] text-slate-500 tabular hidden sm:inline">
                          {r.vacationWeeks} wks vac
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function groupByWindow(rows: BidTimesRow[]): {
  window: string | null;
  rows: BidTimesRow[];
}[] {
  const groups: { window: string | null; rows: BidTimesRow[] }[] = [];
  let current: { window: string | null; rows: BidTimesRow[] } | null = null;
  let inheritedWindow: string | null = null;

  for (const row of rows) {
    if (row.callWindow) {
      inheritedWindow = row.callWindow;
      current = { window: inheritedWindow, rows: [row] };
      groups.push(current);
    } else if (current && current.window === inheritedWindow) {
      current.rows.push(row);
    } else {
      current = { window: inheritedWindow, rows: [row] };
      groups.push(current);
    }
  }
  return groups;
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
      No bid-time data yet.
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
