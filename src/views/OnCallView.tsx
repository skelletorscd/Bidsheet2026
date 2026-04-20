import { useEffect, useMemo } from "react";
import { useCsv } from "../data/useCsv";
import { TabSource, csvUrl } from "../data/sources";
import { Settings } from "../data/settings";
import { parseOnCallCsv } from "../parse/people";
import { PasteFallback } from "../components/PasteFallback";
import { AlertCircle, Inbox, Phone } from "lucide-react";

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

export function OnCallView({ tab, settings, onStatus }: Props) {
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

  const parsed = useMemo(
    () =>
      csvState.csv
        ? parseOnCallCsv(csvState.csv)
        : { hub: null, rows: [], notice: null },
    [csvState.csv],
  );

  const filledCount = parsed.rows.filter((r) => r.driver).length;

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
  if (!parsed.rows.length && csvState.loading) return loading();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="mb-4 flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400" />
              {parsed.hub ?? tab.label} on-call
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {parsed.rows.length} slots · {filledCount} taken
            </p>
          </div>
        </div>

        {parsed.notice && (
          <div className="card p-3 mb-4 border-amber-500/30 bg-amber-500/5">
            <div className="text-[12px] text-amber-200/90 leading-relaxed">
              {parsed.notice}
            </div>
          </div>
        )}

        {parsed.rows.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            <Inbox className="w-8 h-8 mx-auto text-slate-600 mb-3" />
            No on-call slots in the sheet yet.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-border-subtle">
              {parsed.rows.map((row) => (
                <li
                  key={row.position}
                  className="px-4 py-2.5 flex items-center gap-3 hover:bg-bg-hover"
                >
                  <span className="tabular w-10 text-right text-amber-300 font-semibold text-sm">
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
