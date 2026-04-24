// Snapshot-based data access. CSVs are bundled at build time via Vite's
// `?raw` import, so the deployed site is fully self-contained — no live
// Google-Sheet dependency. Re-run scripts/snapshot-sheets.mjs to refresh.

import tolohCsv from "./toloh.csv?raw";
import nblohCsv from "./nbloh.csv?raw";
import sleeperCsv from "./sleeper.csv?raw";
import seniorityCsv from "./seniority.csv?raw";
import bidTimesCsv from "./bidTimes.csv?raw";
import onCallToledoCsv from "./onCallToledo.csv?raw";
import onCallNblohCsv from "./onCallNbloh.csv?raw";
import manifest from "./manifest.json";

export type SnapshotKey =
  | "toloh"
  | "nbloh"
  | "sleeper"
  | "seniority"
  | "bidTimes"
  | "onCallToledo"
  | "onCallNbloh";

export const SNAPSHOT_CSV: Record<SnapshotKey, string> = {
  toloh: tolohCsv,
  nbloh: nblohCsv,
  sleeper: sleeperCsv,
  seniority: seniorityCsv,
  bidTimes: bidTimesCsv,
  onCallToledo: onCallToledoCsv,
  onCallNbloh: onCallNblohCsv,
};

export const SNAPSHOT_MANIFEST = manifest as {
  spreadsheetId: string;
  capturedAt: string;
  sheets: { key: string; label: string; gid: number; bytes?: number }[];
};

/** Wall-clock when the snapshot was taken — shown in the UI footer. */
export function snapshotCapturedAt(): Date {
  return new Date(SNAPSHOT_MANIFEST.capturedAt);
}
