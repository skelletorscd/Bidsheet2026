import { useEffect, useMemo, useState } from "react";
import { TabSource, csvUrl } from "../data/sources";
import { useCsv } from "../data/useCsv";
import { parseAnnualBidCsv } from "../parse/csv";
import { Bid } from "../types";
import { LocationEntry } from "../data/locations";
import { Settings } from "../data/settings";
import { FilterBar, FilterState, SortKey } from "../components/FilterBar";
import { BidRow } from "../components/BidRow";
import { BidDetail } from "../components/BidDetail";
import { PasteFallback } from "../components/PasteFallback";
import { LocationEditor } from "../components/LocationEditor";
import { AlertCircle, ArrowLeft, Inbox } from "lucide-react";

type Props = {
  tab: TabSource;
  settings: Settings;
  locations: Record<string, LocationEntry>;
  onSaveLocation: (code: string, name: string, confirmed: boolean) => void;
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
};

const DEFAULT_FILTER: FilterState = {
  search: "",
  payType: "all",
  scheduleKind: "all",
  qual: "all",
  status: "all",
  startTimeFrom: "",
  startTimeTo: "",
  sort: "bidNum",
};

export function AnnualBidView({
  tab,
  settings,
  locations,
  onSaveLocation,
  onStatus,
}: Props) {
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

  const parsed = useMemo(() => {
    if (!csvState.csv) return { bids: [] as Bid[], warnings: [] as string[] };
    try {
      const r = parseAnnualBidCsv(csvState.csv);
      return r;
    } catch (e) {
      return {
        bids: [] as Bid[],
        warnings: [`Parse error: ${(e as Error).message}`],
      };
    }
  }, [csvState.csv]);

  const bids: Bid[] = useMemo(
    () =>
      parsed.bids.map((b) => ({
        ...b,
        estimatedWeeklyPay:
          b.totalHoursPerWeek * settings.hourlyRate +
          b.totalMilesPerWeek * settings.mileageRate,
      })),
    [parsed.bids, settings.hourlyRate, settings.mileageRate],
  );

  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const qualOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of bids) {
      const q = b.qualifications?.trim();
      if (q) set.add(q);
    }
    return Array.from(set).sort();
  }, [bids]);

  const filtered = useMemo(
    () => sortBids(filterBids(bids, filter), filter.sort),
    [bids, filter],
  );

  const availableCount = useMemo(
    () => bids.filter((b) => b.status === "available").length,
    [bids],
  );

  useEffect(() => {
    if (!filtered.length) return;
    if (!selectedJob || !filtered.find((b) => b.jobNum === selectedJob)) {
      setSelectedJob(filtered[0].jobNum);
    }
  }, [filtered, selectedJob]);

  const selected = filtered.find((b) => b.jobNum === selectedJob) ?? null;

  const similar = useMemo(() => {
    if (!selected) return [];
    return bids
      .filter((b) => b.jobNum !== selected.jobNum)
      .map((b) => ({ b, score: similarity(selected, b) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .filter((x) => x.score > 0)
      .map((x) => x.b);
  }, [bids, selected]);

  if (gid == null) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold">Tab not configured</h3>
          </div>
          <p className="text-sm text-slate-400">
            The <strong>{tab.label}</strong> tab needs a GID from the Google
            Sheet. Open Settings → Tab GIDs and paste the gid for this tab.
          </p>
        </div>
      </div>
    );
  }

  if (csvState.error && !csvState.csv) {
    return (
      <div className="p-6">
        <div className="card p-4 mb-4 border-rose-500/30">
          <div className="flex items-center gap-2 text-rose-300 text-sm">
            <AlertCircle className="w-4 h-4" />
            Couldn't load sheet: {csvState.error}
          </div>
        </div>
        <PasteFallback
          url={csvUrl(settings.spreadsheetId, gid)}
          onSubmit={csvState.setPaste}
        />
      </div>
    );
  }

  if (!bids.length && csvState.loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-pulseDot inline-block w-2 h-2 rounded-full bg-sky-400 mr-2" />
        Loading bids…
      </div>
    );
  }

  if (!bids.length) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Inbox className="w-8 h-8 mx-auto text-slate-600 mb-3" />
        No bids parsed from sheet.
      </div>
    );
  }

  return (
    <>
      <FilterBar
        state={filter}
        onChange={setFilter}
        qualOptions={qualOptions}
        resultCount={filtered.length}
        totalCount={bids.length}
        availableCount={availableCount}
      />
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`md:w-72 lg:w-80 md:shrink-0 md:border-r border-border-subtle bg-bg-panel/40 overflow-y-auto ${
            mobileShowDetail ? "hidden md:block" : "flex-1 md:flex-none"
          }`}
        >
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              No bids match.{" "}
              <button
                className="text-amber-300 underline"
                onClick={() => setFilter(DEFAULT_FILTER)}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {filtered.map((b) => (
                <li key={b.jobNum}>
                  <BidRow
                    bid={b}
                    selected={selected?.jobNum === b.jobNum}
                    onSelect={() => {
                      setSelectedJob(b.jobNum);
                      setMobileShowDetail(true);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>
        <main
          className={`flex-1 overflow-y-auto ${
            mobileShowDetail ? "" : "hidden md:block"
          }`}
        >
          {selected ? (
            <>
              <button
                className="md:hidden flex items-center gap-1.5 px-4 py-3 text-sm text-slate-300 hover:text-amber-300 sticky top-0 bg-bg-base/90 backdrop-blur border-b border-border-subtle z-10 w-full"
                onClick={() => setMobileShowDetail(false)}
              >
                <ArrowLeft className="w-4 h-4" />
                All bids
              </button>
              <BidDetail
                bid={selected}
                locations={locations}
                similar={similar}
                onSelect={(b) => setSelectedJob(b.jobNum)}
                onClickUnknown={(code) => setEditingCode(code)}
              />
            </>
          ) : (
            <div className="p-8 text-center text-slate-400">
              Select a bid from the list.
            </div>
          )}
        </main>
      </div>

      {editingCode && (
        <LocationEditor
          code={editingCode}
          initialName={locations[editingCode]?.name ?? ""}
          onSave={(name, confirmed) =>
            onSaveLocation(editingCode, name, confirmed)
          }
          onClose={() => setEditingCode(null)}
        />
      )}
    </>
  );
}

function filterBids(bids: Bid[], f: FilterState): Bid[] {
  const search = f.search.trim().toLowerCase();
  const fromMin = parseTimeInput(f.startTimeFrom);
  const toMin = parseTimeInput(f.startTimeTo, true);
  return bids.filter((b) => {
    if (f.status === "available" && b.status !== "available") return false;
    if (f.status === "taken" && b.status === "available") return false;
    if (f.payType !== "all" && b.payType !== f.payType) return false;
    if (f.scheduleKind === "weekday" && b.hasWeekend) return false;
    if (f.scheduleKind === "weekend" && !b.hasWeekend) return false;
    if (f.qual !== "all" && b.qualifications !== f.qual) return false;
    if (fromMin != null || toMin != null) {
      const bidMin = timeToMin(b.startTime24);
      if (!timeInRange(bidMin, fromMin, toMin)) return false;
    }
    if (search) {
      const haystack = [
        b.jobNum,
        b.qualifications,
        b.startTime24,
        b.startTime12,
        b.destinations.join(" "),
        b.legs.map((l) => l.routeRaw).join(" "),
        b.legs.map((l) => l.daysRaw).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function sortBids(bids: Bid[], sort: SortKey): Bid[] {
  const copy = [...bids];
  switch (sort) {
    case "bidNum":
      copy.sort((a, b) => a.bidNum - b.bidNum);
      break;
    case "startTime":
      copy.sort((a, b) => timeToMin(a.startTime24) - timeToMin(b.startTime24));
      break;
    case "hoursDesc":
      copy.sort((a, b) => b.totalHoursPerWeek - a.totalHoursPerWeek);
      break;
    case "milesDesc":
      copy.sort((a, b) => b.totalMilesPerWeek - a.totalMilesPerWeek);
      break;
    case "payDesc":
      copy.sort((a, b) => b.estimatedWeeklyPay - a.estimatedWeeklyPay);
      break;
  }
  return copy;
}

function timeToMin(t: string): number {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

function parseTimeInput(raw: string, isEnd = false): number | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return isEnd && mins === 0 ? 24 * 60 : mins;
}

function timeInRange(
  bidMin: number,
  fromMin: number | null,
  toMin: number | null,
): boolean {
  if (fromMin == null && toMin == null) return true;
  const lo = fromMin ?? 0;
  const hi = toMin ?? 24 * 60;
  if (lo <= hi) return bidMin >= lo && bidMin <= hi;
  return bidMin >= lo || bidMin <= hi;
}

function similarity(a: Bid, b: Bid): number {
  let score = 0;
  if (a.startTime24 === b.startTime24) score += 5;
  else if (
    Math.abs(timeToMin(a.startTime24) - timeToMin(b.startTime24)) <= 30
  ) {
    score += 2;
  }
  const aDest = new Set(a.destinations);
  const overlap = b.destinations.filter((d) => aDest.has(d)).length;
  score += overlap;
  if (a.payType === b.payType) score += 1;
  return score;
}
