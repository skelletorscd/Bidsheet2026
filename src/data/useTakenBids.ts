import { useMemo } from "react";
import { useCsv } from "./useCsv";
import { parseAnnualBidCsv } from "../parse/csv";
import { parseOnCallCsv } from "../parse/people";
import { Settings } from "./settings";
import { TAB_SOURCES } from "./sources";
import { namesMatch, normalizeName, NormalizedName } from "../parse/names";

export type TakenBid = {
  /** Either a bid's job number (e.g. "WP01") or the sentinel "ON-CALL". */
  jobNum: string;
  bidNum: number;
  /** TOL / NBL / ALL for annual bids; TOL / NBL for on-call slots. */
  hub: "TOL" | "NBL" | "ALL" | null;
  kind: "bid" | "onCall";
  driverRaw: string;
  driverNormalized: NormalizedName;
};

export const ON_CALL_JOB_NUM = "ON-CALL";

export type TakenBidsState = {
  taken: TakenBid[];
  loading: boolean;
  lookup: (driverName: string) => TakenBid | null;
};

export function useTakenBids(settings: Settings): TakenBidsState {
  const toledoTab = TAB_SOURCES.find((t) => t.key === "toledo")!;
  const nblohTab = TAB_SOURCES.find((t) => t.key === "northBaltimore")!;
  const sleeperTab = TAB_SOURCES.find((t) => t.key === "sleeper")!;
  const onCallTolTab = TAB_SOURCES.find((t) => t.key === "oncallToloh")!;
  const onCallNblTab = TAB_SOURCES.find((t) => t.key === "oncallNbloh")!;

  const toledoGid =
    settings.customGids[toledoTab.key] ?? toledoTab.gid ?? null;
  const nblohGid = settings.customGids[nblohTab.key] ?? nblohTab.gid ?? null;
  const sleeperGid =
    settings.customGids[sleeperTab.key] ?? sleeperTab.gid ?? null;
  const onCallTolGid =
    settings.customGids[onCallTolTab.key] ?? onCallTolTab.gid ?? null;
  const onCallNblGid =
    settings.customGids[onCallNblTab.key] ?? onCallNblTab.gid ?? null;

  const toledoCsv = useCsv(
    settings.spreadsheetId,
    toledoGid,
    settings.refreshIntervalSec,
  );
  const nblohCsv = useCsv(
    settings.spreadsheetId,
    nblohGid,
    settings.refreshIntervalSec,
  );
  const sleeperCsv = useCsv(
    settings.spreadsheetId,
    sleeperGid,
    settings.refreshIntervalSec,
  );
  const onCallTolCsv = useCsv(
    settings.spreadsheetId,
    onCallTolGid,
    settings.refreshIntervalSec,
  );
  const onCallNblCsv = useCsv(
    settings.spreadsheetId,
    onCallNblGid,
    settings.refreshIntervalSec,
  );

  const taken = useMemo<TakenBid[]>(() => {
    const out: TakenBid[] = [];

    // Annual bid tabs first — they take precedence if a driver somehow
    // appears in both an annual tab and an on-call tab.
    const bidSources: {
      csv: string | null;
      hub: "TOL" | "NBL" | "ALL";
    }[] = [
      { csv: toledoCsv.csv, hub: "TOL" },
      { csv: nblohCsv.csv, hub: "NBL" },
      { csv: sleeperCsv.csv, hub: "ALL" },
    ];
    for (const s of bidSources) {
      if (!s.csv) continue;
      try {
        const parsed = parseAnnualBidCsv(s.csv);
        for (const b of parsed.bids) {
          // Sleeper teams have multiple takers per bid (A + B drivers); a
          // regular bid has one. Emit a TakenBid record for every taker so
          // every driver gets credit for the pick.
          for (const driver of b.takers) {
            out.push({
              jobNum: b.jobNum,
              bidNum: b.bidNum,
              hub: s.hub,
              kind: "bid",
              driverRaw: driver,
              driverNormalized: normalizeName(driver),
            });
          }
        }
      } catch {
        // ignore — bad CSV won't block the other tabs
      }
    }

    // On-call tabs — anyone in here who wasn't already matched from an
    // annual tab gets an ON-CALL marker for the hub they signed up at.
    const onCallSources: { csv: string | null; hub: "TOL" | "NBL" }[] = [
      { csv: onCallTolCsv.csv, hub: "TOL" },
      { csv: onCallNblCsv.csv, hub: "NBL" },
    ];
    for (const s of onCallSources) {
      if (!s.csv) continue;
      try {
        const parsed = parseOnCallCsv(s.csv);
        for (const row of parsed.rows) {
          if (!row.driver) continue;
          out.push({
            jobNum: ON_CALL_JOB_NUM,
            bidNum: row.position,
            hub: s.hub,
            kind: "onCall",
            driverRaw: row.driver,
            driverNormalized: normalizeName(row.driver),
          });
        }
      } catch {
        // ignore
      }
    }

    return out;
  }, [
    toledoCsv.csv,
    nblohCsv.csv,
    sleeperCsv.csv,
    onCallTolCsv.csv,
    onCallNblCsv.csv,
  ]);

  const lookup = useMemo(
    () => (driverName: string) => {
      const target = normalizeName(driverName);
      if (!target.last) return null;
      // Scan twice so bids always win over on-call entries — this matters
      // if somebody had on-call last year and now took an annual bid.
      for (const t of taken) {
        if (t.kind === "bid" && namesMatch(target, t.driverNormalized)) {
          return t;
        }
      }
      for (const t of taken) {
        if (t.kind === "onCall" && namesMatch(target, t.driverNormalized)) {
          return t;
        }
      }
      return null;
    },
    [taken],
  );

  const loading =
    toledoCsv.loading ||
    nblohCsv.loading ||
    sleeperCsv.loading ||
    onCallTolCsv.loading ||
    onCallNblCsv.loading;

  return { taken, loading, lookup };
}
