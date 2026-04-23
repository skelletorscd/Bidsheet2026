import { useEffect, useMemo } from "react";
import { Hourglass, Phone, Trophy, User2 } from "lucide-react";
import { useCsv } from "../data/useCsv";
import { Settings } from "../data/settings";
import { TAB_SOURCES } from "../data/sources";
import { parseBidTimesCsv, BidTimesRow } from "../parse/people";
import { useTakenBids, ON_CALL_JOB_NUM } from "../data/useTakenBids";
import { useBidTimings, PickEvent } from "../data/useBidTimings";
import {
  formatCallWindow,
  formatYears,
  parseDateMDY,
  yearsSince,
} from "../util/people";

type Props = {
  settings: Settings;
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
};

const UNSCHEDULED_TOP = 4; // ranks 1-4 don't have call windows

export function NowBiddingView({ settings, onStatus }: Props) {
  const bidTimesTab = TAB_SOURCES.find((t) => t.key === "bidTimes")!;
  const gid = settings.customGids[bidTimesTab.key] ?? bidTimesTab.gid ?? null;
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
  const timings = useBidTimings(takenBids.taken);

  // The bid call moves strictly down the seniority list. The high-water mark
  // is the latest rank we've actually seen pick something — anyone with a
  // lower rank who's still showing 'pending' was passed / absent / on
  // vacation, not literally up to bid right now. So the current bidder is
  // the first pending driver above that high-water mark; anything before it
  // is grouped as "passed" so it doesn't pollute the on-deck queue.
  const { current, onDeck, passedBefore, allDone, highWaterRank } = useMemo(() => {
    const result: {
      current: BidTimesRow | null;
      onDeck: BidTimesRow[];
      passedBefore: BidTimesRow[];
      allDone: boolean;
      highWaterRank: number;
    } = {
      current: null,
      onDeck: [],
      passedBefore: [],
      allDone: false,
      highWaterRank: UNSCHEDULED_TOP,
    };

    let highWater = UNSCHEDULED_TOP;
    for (const row of rows) {
      if (takenBids.lookup(row.name) && row.rank > highWater) {
        highWater = row.rank;
      }
    }
    result.highWaterRank = highWater;

    let foundCurrent = false;
    let pendingAfter = 0;
    for (const row of rows) {
      if (row.rank <= UNSCHEDULED_TOP) continue;
      const picked = takenBids.lookup(row.name);
      if (picked) continue;
      if (row.rank <= highWater) {
        // Pending but already passed in the call order.
        result.passedBefore.push(row);
        continue;
      }
      if (!foundCurrent) {
        result.current = row;
        foundCurrent = true;
      } else if (result.onDeck.length < 3) {
        result.onDeck.push(row);
      }
      pendingAfter++;
    }
    if (!foundCurrent && pendingAfter === 0) result.allDone = true;
    return result;
  }, [rows, takenBids]);

  const elapsedSinceLast = timings.lastPickAt
    ? Math.max(0, timings.nowMs - timings.lastPickAt)
    : null;

  // Average + median pick durations (excludes the very first which has no
  // prior to compare to).
  const completedDurations = useMemo(() => {
    const ds = timings.history
      .map((h) => h.durationMs)
      .filter((d): d is number => d != null && d > 0);
    return ds;
  }, [timings.history]);

  const avgMs = completedDurations.length
    ? completedDurations.reduce((a, b) => a + b, 0) /
      completedDurations.length
    : null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        {/* Hero — current bidder */}
        <CurrentBidderCard
          current={current}
          elapsedMs={elapsedSinceLast}
          avgMs={avgMs}
          totalPicks={timings.history.length}
          allDone={allDone}
          highWaterRank={highWaterRank}
        />

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile
            label="Picks observed"
            value={`${timings.history.length}`}
          />
          <StatTile
            label="Avg time per bid"
            value={avgMs ? formatDuration(avgMs, true) : "—"}
          />
          <StatTile
            label="Last pick"
            value={
              elapsedSinceLast != null
                ? `${formatDuration(elapsedSinceLast, true)} ago`
                : "—"
            }
          />
          <StatTile
            label="Drivers awaiting call"
            value={`${rows.filter((r) => r.rank > highWaterRank && !takenBids.lookup(r.name)).length}`}
          />
        </div>

        {/* Passed-before — drivers earlier in the call who never got marked
            with a pick. Could be on vacation, off-roster, or just data lag.
            Collapsed by default; expanded to a compact list. */}
        {passedBefore.length > 0 && (
          <details className="card p-4 group">
            <summary className="cursor-pointer flex items-center justify-between gap-2 list-none">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="text-amber-400">⚠</span>
                {passedBefore.length} earlier driver
                {passedBefore.length === 1 ? "" : "s"} passed / absent
              </h3>
              <span className="text-[11px] text-slate-500 group-open:hidden">
                show
              </span>
              <span className="text-[11px] text-slate-500 hidden group-open:inline">
                hide
              </span>
            </summary>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              The bid call has moved past these ranks (a higher seniority
              driver has already picked). They're typically on vacation or
              didn't take a bid.
            </p>
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[12px]">
              {passedBefore.map((r) => (
                <li
                  key={r.rank}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-hover"
                >
                  <span className="tabular w-8 text-right text-slate-500 font-semibold">
                    {r.rank}
                  </span>
                  <span className="flex-1 text-slate-300 truncate">
                    {r.name}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* On-deck */}
        {onDeck.length > 0 && (
          <section className="card p-4">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-3">
              On deck
            </h3>
            <ul className="space-y-1.5">
              {onDeck.map((r) => (
                <li
                  key={r.rank}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-bg-hover"
                >
                  <span className="tabular w-10 text-right text-amber-300 font-semibold">
                    {r.rank}
                  </span>
                  <span className="flex-1 text-slate-200 font-medium">
                    {r.name}
                  </span>
                  <span className="text-[11px] text-slate-500 tabular">
                    {formatCallWindow(r.callWindow) ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Recent activity feed */}
        <section className="card p-4">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Recent picks (newest first)
          </h3>
          {timings.history.length === 0 ? (
            <p className="text-sm text-slate-500 italic">
              Nothing observed yet — the activity feed fills up as the app
              detects new picks.
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {timings.history.slice(0, 25).map((ev) => (
                <RecentPickRow key={ev.key} ev={ev} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-slate-600 italic">
            Pick durations are measured from when this device first observed
            each pick. Open the app on the same device throughout bid day
            for accurate timings; cleared if you wipe browser data.
          </p>
        </section>
      </div>
    </div>
  );
}

function CurrentBidderCard({
  current,
  elapsedMs,
  avgMs,
  totalPicks,
  allDone,
  highWaterRank,
}: {
  current: BidTimesRow | null;
  elapsedMs: number | null;
  avgMs: number | null;
  totalPicks: number;
  allDone: boolean;
  highWaterRank: number;
}) {
  const callWindow = current?.callWindow
    ? formatCallWindow(current.callWindow)
    : null;
  const seniorityDate = parseDateMDY(current?.ftDate ?? null);
  const yrs = yearsSince(seniorityDate);

  // Color the timer according to how it stacks up against the average so
  // it's instantly obvious if a driver is taking unusually long.
  const slowThreshold = avgMs ? avgMs * 1.6 : null;
  const verySlowThreshold = avgMs ? avgMs * 2.5 : null;
  let timerColor = "text-emerald-300";
  if (elapsedMs != null && verySlowThreshold && elapsedMs > verySlowThreshold)
    timerColor = "text-rose-300 animate-pulseDot";
  else if (elapsedMs != null && slowThreshold && elapsedMs > slowThreshold)
    timerColor = "text-amber-300";

  return (
    <div className="card overflow-hidden">
      <div className="px-5 sm:px-7 pt-5 pb-4 flex items-start gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <HourglassIcon spinning={elapsedMs != null} color={timerColor} />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80 font-semibold">
              Now bidding
            </div>
            {current ? (
              <>
                <div className="font-bold text-2xl sm:text-3xl text-slate-50 mt-0.5 truncate">
                  {current.name}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2 tabular">
                  <span className="font-mono text-amber-300 font-semibold">
                    Rank #{current.rank}
                  </span>
                  {callWindow && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span>{callWindow}</span>
                    </>
                  )}
                  {seniorityDate && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span>{formatYears(yrs)} with company</span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="font-bold text-xl text-slate-300 mt-0.5">
                {allDone
                  ? "All scheduled drivers have picked"
                  : totalPicks > 0
                    ? `Last pick was rank #${highWaterRank} — waiting for the next driver`
                    : "Waiting for the first pick…"}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">
            Time since last pick
          </div>
          <div
            className={`text-3xl sm:text-4xl font-black tabular leading-none mt-1 ${timerColor}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {elapsedMs != null ? formatDuration(elapsedMs) : "00:00"}
          </div>
          {avgMs && (
            <div className="text-[10px] text-slate-500 mt-1">
              avg {formatDuration(avgMs, true)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HourglassIcon({
  spinning,
  color,
}: {
  spinning: boolean;
  color: string;
}) {
  return (
    <div
      className={`w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0 ${color}`}
      style={{
        animation: spinning ? "hourglassFlip 3.5s ease-in-out infinite" : undefined,
        transformOrigin: "50% 50%",
      }}
    >
      <Hourglass className="w-6 h-6" />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-raised border border-border-subtle rounded-lg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </div>
      <div className="text-base sm:text-lg font-semibold text-slate-100 tabular mt-1">
        {value}
      </div>
    </div>
  );
}

function RecentPickRow({ ev }: { ev: PickEvent }) {
  const isOnCall = ev.jobNum === ON_CALL_JOB_NUM;
  return (
    <li className="py-2 flex items-center gap-3">
      {isOnCall ? (
        <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
      ) : (
        <User2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      )}
      <span className="flex-1 text-sm text-slate-200 truncate">
        {ev.driverRaw}
      </span>
      <span
        className={`font-mono text-[12px] font-semibold tabular ${isOnCall ? "text-sky-300" : "text-amber-300"}`}
      >
        {isOnCall ? `ON-CALL ${ev.hub ?? ""}` : ev.jobNum}
        {!isOnCall && ev.hub && ev.hub !== "TOL" && (
          <span className="ml-1 text-[10px] text-slate-500 font-normal tracking-wider uppercase">
            {ev.hub === "NBL" ? "NBL" : ev.hub === "ALL" ? "Sleep" : ""}
          </span>
        )}
      </span>
      <span className="text-[11px] text-slate-500 tabular w-16 text-right shrink-0">
        {ev.durationMs != null ? `+${formatDuration(ev.durationMs, true)}` : "—"}
      </span>
    </li>
  );
}

function formatDuration(ms: number, compact = false): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (compact) {
    if (h > 0) return `${h}h${m}m`;
    if (m > 0) return `${m}m${s.toString().padStart(2, "0")}s`;
    return `${s}s`;
  }
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
