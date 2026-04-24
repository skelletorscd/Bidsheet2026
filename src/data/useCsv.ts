// Snapshot-backed synchronous data source. Replaces the former live-fetch
// implementation; every view that used to call `useCsv(spreadsheetId, gid)`
// now gets the bundled snapshot back instantly.

import { useMemo } from "react";
import {
  SNAPSHOT_CSV,
  SNAPSHOT_MANIFEST,
  snapshotCapturedAt,
  SnapshotKey,
} from "./snapshots";

const GID_TO_KEY: Record<number, SnapshotKey> = {
  1758902346: "toloh",
  1635180906: "nbloh",
  1077520417: "sleeper",
  2137587180: "seniority",
  1262154739: "bidTimes",
  1076391541: "onCallToledo",
  1257999271: "onCallNbloh",
};

export type CsvState = {
  csv: string | null;
  source: "snapshot" | null;
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
};

/**
 * Back-compat shim: accepts the old (spreadsheetId, gid) signature, returns
 * the bundled snapshot CSV for that tab. No network, no loading state. The
 * first argument is ignored.
 */
export function useCsv(
  _spreadsheetId: string,
  gid: number | null,
  _refreshIntervalSec: number,
): CsvState & {
  refresh: () => void;
  setPaste: (csv: string) => void;
} {
  const key = gid != null ? GID_TO_KEY[gid] : undefined;
  const csv = key ? SNAPSHOT_CSV[key] : null;
  const fetchedAt = snapshotCapturedAt().getTime();

  const state = useMemo<CsvState>(
    () => ({
      csv,
      source: csv ? "snapshot" : null,
      fetchedAt,
      loading: false,
      error: csv ? null : gid != null ? "Unknown snapshot" : null,
    }),
    [csv, fetchedAt, gid],
  );

  return {
    ...state,
    refresh: () => {},
    setPaste: () => {},
  };
}

export { SNAPSHOT_MANIFEST };
