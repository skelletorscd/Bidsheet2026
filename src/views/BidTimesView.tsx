import { useEffect, useMemo } from "react";
import { useCsv } from "../data/useCsv";
import { TabSource, csvUrl } from "../data/sources";
import { Settings } from "../data/settings";
import { parseBidTimesCsv, BidTimesRow } from "../parse/people";
import { PasteFallback } from "../components/PasteFallback";
import { AlertCircle, Calendar, Inbox } from "lucide-react";
import { formatCallWindow } from "../util/people";

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
                {g.rows.map((r) => (
                  <li
                    key={r.rank}
                    className="px-4 py-2 flex items-center gap-3 hover:bg-bg-hover"
                  >
                    <span className="tabular w-10 text-right text-amber-300 font-semibold">
                      {r.rank}
                    </span>
                    <span className="flex-1 text-slate-100 font-medium">
                      {r.name}
                    </span>
                    {r.vacationWeeks && (
                      <span className="text-[11px] text-slate-500 tabular">
                        {r.vacationWeeks} wks vac
                      </span>
                    )}
                    {r.ftDate && (
                      <span className="text-[11px] text-slate-500 tabular hidden sm:inline">
                        FT {r.ftDate}
                      </span>
                    )}
                  </li>
                ))}
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
