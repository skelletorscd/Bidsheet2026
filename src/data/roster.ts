// Builds the master roster: every driver on the seniority list, with their
// pick (or on-call assignment, or LIMBO), call window, tenure, etc. Derived
// entirely from the bundled snapshots — computed once at module load.

import { parseAnnualBidCsv } from "../parse/csv";
import {
  parseSeniorityCsv,
  parseBidTimesCsv,
  parseOnCallCsv,
  BidTimesRow,
  SeniorityRow,
} from "../parse/people";
import { namesMatch, normalizeName, NormalizedName } from "../parse/names";
import { Bid } from "../types";
import { SNAPSHOT_CSV } from "./snapshots";

export type HubCode = "TOL" | "NBL" | "ALL";

export type SnapshotBid = Bid & {
  hub: HubCode;
};

export type PickInfo =
  | {
      kind: "bid";
      jobNum: string;
      bidNum: number;
      hub: HubCode;
      /** Exact name as it appeared in the bid sheet. */
      takenByRaw: string;
      /** All drivers who co-took this bid (sleeper teams have 2). */
      coTakers: string[];
    }
  | {
      kind: "onCall";
      hub: "TOL" | "NBL";
      position: number;
    }
  | { kind: "limbo" }
  | { kind: "pending" };

export type RosterEntry = {
  rank: number;
  name: string;
  classification: string | null;
  ftDate: string | null;
  ptDate: string | null;
  vacationWeeks: string | null;
  callWindow: string | null;
  pick: PickInfo;
};

// ─── Parse each snapshot once, in module load order ─────────────────────

export const TOLEDO_BIDS: SnapshotBid[] = parseAnnualBidCsv(
  SNAPSHOT_CSV.toloh,
).bids.map((b) => ({ ...b, hub: "TOL" as HubCode }));

export const NBLOH_BIDS: SnapshotBid[] = parseAnnualBidCsv(
  SNAPSHOT_CSV.nbloh,
).bids.map((b) => ({ ...b, hub: "NBL" as HubCode }));

export const SLEEPER_BIDS: SnapshotBid[] = parseAnnualBidCsv(
  SNAPSHOT_CSV.sleeper,
).bids.map((b) => ({ ...b, hub: "ALL" as HubCode }));

export const ALL_BIDS: SnapshotBid[] = [
  ...TOLEDO_BIDS,
  ...NBLOH_BIDS,
  ...SLEEPER_BIDS,
];

export const SENIORITY_RAW: SeniorityRow[] = parseSeniorityCsv(
  SNAPSHOT_CSV.seniority,
);

export const BID_TIMES_RAW: BidTimesRow[] = parseBidTimesCsv(
  SNAPSHOT_CSV.bidTimes,
);

const ON_CALL_TOL = parseOnCallCsv(SNAPSHOT_CSV.onCallToledo);
const ON_CALL_NBL = parseOnCallCsv(SNAPSHOT_CSV.onCallNbloh);

// ─── Compute roster ─────────────────────────────────────────────────────

type TakenRecord = {
  hub: HubCode;
  jobNum: string;
  bidNum: number;
  driverRaw: string;
  driverNormalized: NormalizedName;
  coTakers: string[];
};

const ALL_TAKEN: TakenRecord[] = [];
for (const b of ALL_BIDS) {
  for (const driver of b.takers) {
    ALL_TAKEN.push({
      hub: b.hub,
      jobNum: b.jobNum,
      bidNum: b.bidNum,
      driverRaw: driver,
      driverNormalized: normalizeName(driver),
      coTakers: b.takers.filter((x) => x !== driver),
    });
  }
}

type OnCallRecord = {
  hub: "TOL" | "NBL";
  position: number;
  driverNormalized: NormalizedName;
};
const ALL_ON_CALL: OnCallRecord[] = [];
for (const row of ON_CALL_TOL.rows) {
  if (row.driver) {
    ALL_ON_CALL.push({
      hub: "TOL",
      position: row.position,
      driverNormalized: normalizeName(row.driver),
    });
  }
}
for (const row of ON_CALL_NBL.rows) {
  if (row.driver) {
    ALL_ON_CALL.push({
      hub: "NBL",
      position: row.position,
      driverNormalized: normalizeName(row.driver),
    });
  }
}

function lookupBidTakenBy(driver: NormalizedName): TakenRecord | null {
  for (const t of ALL_TAKEN) {
    if (namesMatch(driver, t.driverNormalized)) return t;
  }
  return null;
}

function lookupOnCall(driver: NormalizedName): OnCallRecord | null {
  for (const r of ALL_ON_CALL) {
    if (namesMatch(driver, r.driverNormalized)) return r;
  }
  return null;
}

/** Call window derived from bid-times; inherits from the nearest row above
 *  that carried an explicit window (bid call windows are group-labelled). */
function buildCallTimeByRank(): Map<number, string> {
  const map = new Map<number, string>();
  let carry: string | null = null;
  for (const row of BID_TIMES_RAW) {
    if (row.callWindow) carry = row.callWindow;
    if (carry) map.set(row.rank, carry);
  }
  return map;
}

const callTimeByRank = buildCallTimeByRank();

// Use bid-times rows when present (has classification, vac weeks etc) and
// fall back to plain seniority for drivers missing from bid-times.
const ROSTER_SOURCES = (() => {
  const byRank = new Map<number, RosterEntry>();
  for (const r of BID_TIMES_RAW) {
    byRank.set(r.rank, {
      rank: r.rank,
      name: r.name,
      classification: r.classification ?? null,
      ftDate: r.ftDate,
      ptDate: r.ptDate,
      vacationWeeks: r.vacationWeeks,
      callWindow: callTimeByRank.get(r.rank) ?? null,
      pick: { kind: "pending" },
    });
  }
  for (const r of SENIORITY_RAW) {
    if (byRank.has(r.rank)) continue;
    byRank.set(r.rank, {
      rank: r.rank,
      name: r.name,
      classification: null,
      ftDate: r.ftDate,
      ptDate: r.ptDate,
      vacationWeeks: null,
      callWindow: callTimeByRank.get(r.rank) ?? null,
      pick: { kind: "pending" },
    });
  }
  return byRank;
})();

// Seed pick info from sheet cross-references.
for (const entry of ROSTER_SOURCES.values()) {
  const driver = normalizeName(entry.name);
  const bidMatch = lookupBidTakenBy(driver);
  if (bidMatch) {
    entry.pick = {
      kind: "bid",
      jobNum: bidMatch.jobNum,
      bidNum: bidMatch.bidNum,
      hub: bidMatch.hub,
      takenByRaw: bidMatch.driverRaw,
      coTakers: bidMatch.coTakers,
    };
    continue;
  }
  const onCallMatch = lookupOnCall(driver);
  if (onCallMatch) {
    entry.pick = {
      kind: "onCall",
      hub: onCallMatch.hub,
      position: onCallMatch.position,
    };
    continue;
  }
}

// After cross-referencing, flip anyone below the high-water mark of taken
// bids to LIMBO instead of "pending" — the call has moved past them.
const HIGH_WATER_BID_RANK = (() => {
  let max = 0;
  for (const entry of ROSTER_SOURCES.values()) {
    if (entry.pick.kind === "bid" && entry.rank > max) max = entry.rank;
  }
  return max;
})();

const HIGH_WATER_ON_CALL_RANK = (() => {
  let max = 0;
  for (const entry of ROSTER_SOURCES.values()) {
    if (entry.pick.kind === "onCall" && entry.rank > max) max = entry.rank;
  }
  return max;
})();

const HIGH_WATER_RANK = Math.max(HIGH_WATER_BID_RANK, HIGH_WATER_ON_CALL_RANK);

for (const entry of ROSTER_SOURCES.values()) {
  if (entry.pick.kind !== "pending") continue;
  if (entry.rank <= HIGH_WATER_RANK) {
    entry.pick = { kind: "limbo" };
  }
}

export const ROSTER: RosterEntry[] = [...ROSTER_SOURCES.values()].sort(
  (a, b) => a.rank - b.rank,
);

// ─── Headline counts (used everywhere) ──────────────────────────────────

function hubCounts(hub: HubCode) {
  const bids = ALL_BIDS.filter((b) => b.hub === hub);
  const total = bids.length;
  const taken = bids.filter((b) => b.status === "taken").length;
  return { total, taken, available: total - taken };
}

export const HEADLINE_COUNTS = {
  toledo: hubCounts("TOL"),
  nbloh: hubCounts("NBL"),
  sleeper: hubCounts("ALL"),
  onCallToledo: {
    total: ON_CALL_TOL.rows.length,
    filled: ON_CALL_TOL.rows.filter((r) => r.driver).length,
  },
  onCallNbloh: {
    total: ON_CALL_NBL.rows.length,
    filled: ON_CALL_NBL.rows.filter((r) => r.driver).length,
  },
  totalDrivers: ROSTER.length,
  picked: ROSTER.filter((r) => r.pick.kind === "bid").length,
  onCall: ROSTER.filter((r) => r.pick.kind === "onCall").length,
  limbo: ROSTER.filter((r) => r.pick.kind === "limbo").length,
  pending: ROSTER.filter((r) => r.pick.kind === "pending").length,
  highWaterRank: HIGH_WATER_RANK,
};

export function rosterByStatus(kind: PickInfo["kind"]): RosterEntry[] {
  return ROSTER.filter((r) => r.pick.kind === kind);
}

export function findByName(raw: string): RosterEntry | null {
  const target = normalizeName(raw);
  for (const r of ROSTER) {
    if (namesMatch(normalizeName(r.name), target)) return r;
  }
  return null;
}
