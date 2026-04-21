import { useMemo } from "react";
import { useCsv } from "./useCsv";
import { parseAnnualBidCsv } from "../parse/csv";
import { parseOnCallCsv } from "../parse/people";
import { Settings } from "./settings";
import { TAB_SOURCES } from "./sources";

export type HubBidCounts = {
  total: number;
  taken: number;
  available: number;
};

export type HubOnCallCounts = {
  total: number;
  filled: number;
};

export type GlobalCounts = {
  toledoBids: HubBidCounts;
  nblohBids: HubBidCounts;
  onCallToledo: HubOnCallCounts;
  onCallNbloh: HubOnCallCounts;
  ready: boolean;
};

/**
 * Cross-tab statistics for the always-visible header strip. Fetches the four
 * feeder-relevant sheets (Toledo annual, NBL annual, Toledo on-call, NBL
 * on-call) in parallel and derives totals + filled counts. Counts update
 * live via the same polling + visibility refresh that every other hook uses.
 */
export function useGlobalCounts(settings: Settings): GlobalCounts {
  const byKey = Object.fromEntries(TAB_SOURCES.map((t) => [t.key, t]));

  const toledoGid =
    settings.customGids["toledo"] ?? byKey.toledo.gid ?? null;
  const nblohGid =
    settings.customGids["northBaltimore"] ?? byKey.northBaltimore.gid ?? null;
  const onCallTolGid =
    settings.customGids["oncallToloh"] ?? byKey.oncallToloh.gid ?? null;
  const onCallNblGid =
    settings.customGids["oncallNbloh"] ?? byKey.oncallNbloh.gid ?? null;

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

  return useMemo<GlobalCounts>(() => {
    const toledoBids = bidCounts(toledoCsv.csv);
    const nblohBids = bidCounts(nblohCsv.csv);
    const onCallToledo = onCallCounts(onCallTolCsv.csv);
    const onCallNbloh = onCallCounts(onCallNblCsv.csv);

    const ready =
      toledoCsv.csv !== null ||
      nblohCsv.csv !== null ||
      onCallTolCsv.csv !== null ||
      onCallNblCsv.csv !== null;

    return { toledoBids, nblohBids, onCallToledo, onCallNbloh, ready };
  }, [toledoCsv.csv, nblohCsv.csv, onCallTolCsv.csv, onCallNblCsv.csv]);
}

function bidCounts(csv: string | null): HubBidCounts {
  if (!csv) return { total: 0, taken: 0, available: 0 };
  try {
    const parsed = parseAnnualBidCsv(csv);
    const total = parsed.bids.length;
    const taken = parsed.bids.filter((b) => b.status === "taken").length;
    return { total, taken, available: total - taken };
  } catch {
    return { total: 0, taken: 0, available: 0 };
  }
}

function onCallCounts(csv: string | null): HubOnCallCounts {
  if (!csv) return { total: 0, filled: 0 };
  try {
    const parsed = parseOnCallCsv(csv);
    const total = parsed.rows.length;
    const filled = parsed.rows.filter((r) => r.driver).length;
    return { total, filled };
  } catch {
    return { total: 0, filled: 0 };
  }
}
