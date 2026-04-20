import { useMemo } from "react";
import { useCsv } from "./useCsv";
import { parseAnnualBidCsv } from "../parse/csv";
import { Settings } from "./settings";
import { TAB_SOURCES } from "./sources";
import { namesMatch, normalizeName, NormalizedName } from "../parse/names";

export type TakenBid = {
  jobNum: string;
  bidNum: number;
  hub: "TOL" | "NBL" | "ALL" | null;
  driverRaw: string;
  driverNormalized: NormalizedName;
};

export type TakenBidsState = {
  taken: TakenBid[];
  loading: boolean;
  lookup: (driverName: string) => TakenBid | null;
};

export function useTakenBids(settings: Settings): TakenBidsState {
  const toledoTab = TAB_SOURCES.find((t) => t.key === "toledo")!;
  const nblohTab = TAB_SOURCES.find((t) => t.key === "northBaltimore")!;
  const sleeperTab = TAB_SOURCES.find((t) => t.key === "sleeper")!;

  const toledoGid =
    settings.customGids[toledoTab.key] ?? toledoTab.gid ?? null;
  const nblohGid = settings.customGids[nblohTab.key] ?? nblohTab.gid ?? null;
  const sleeperGid =
    settings.customGids[sleeperTab.key] ?? sleeperTab.gid ?? null;

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

  const taken = useMemo<TakenBid[]>(() => {
    const out: TakenBid[] = [];
    const sources: {
      csv: string | null;
      hub: "TOL" | "NBL" | "ALL";
    }[] = [
      { csv: toledoCsv.csv, hub: "TOL" },
      { csv: nblohCsv.csv, hub: "NBL" },
      { csv: sleeperCsv.csv, hub: "ALL" },
    ];
    for (const s of sources) {
      if (!s.csv) continue;
      try {
        const parsed = parseAnnualBidCsv(s.csv);
        for (const b of parsed.bids) {
          if (b.takenBy) {
            out.push({
              jobNum: b.jobNum,
              bidNum: b.bidNum,
              hub: s.hub,
              driverRaw: b.takenBy,
              driverNormalized: normalizeName(b.takenBy),
            });
          }
        }
      } catch {
        // ignore — bad CSV won't block the other tabs
      }
    }
    return out;
  }, [toledoCsv.csv, nblohCsv.csv, sleeperCsv.csv]);

  const lookup = useMemo(
    () => (driverName: string) => {
      const target = normalizeName(driverName);
      if (!target.last) return null;
      for (const t of taken) {
        if (namesMatch(target, t.driverNormalized)) return t;
      }
      return null;
    },
    [taken],
  );

  const loading =
    toledoCsv.loading || nblohCsv.loading || sleeperCsv.loading;

  return { taken, loading, lookup };
}
