import Papa from "papaparse";
import {
  Bid,
  Leg,
  ParsedSheet,
  SheetMeta,
  SimpleTable,
} from "../types";
import { parseDays } from "./days";
import { parseRoute } from "./route";
import { parseSchedule } from "./schedule";
import { normalizeTime24, to12Hour } from "./time";

function isAllBlank(row: string[]): boolean {
  return row.every((c) => !c || !c.trim());
}

function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.some((c) => c && /start\s*time/i.test(c))) return i;
  }
  return -1;
}

function classifyPayType(legs: Leg[]): Bid["payType"] {
  let h = 0;
  let m = 0;
  for (const l of legs) {
    if (l.hours != null && l.hours > 0) h++;
    if (l.miles != null && l.miles > 0) m++;
  }
  if (h && m) return "mixed";
  if (h) return "hourly";
  if (m) return "mileage";
  return "unknown";
}

function extractTakenBy(colH: string): string | null {
  const t = colH.trim();
  if (!t) return null;
  // Sleeper tab uses col H as "Drivers" with A./B./C. slot markers.
  if (/^[A-Z]\.?$/.test(t)) return null;
  return t;
}

function buildBid(
  bidNum: number,
  jobNum: string,
  startTime24: string,
  qualifications: string,
  legs: Leg[],
  takers: string[],
): Bid {
  let totalHours = 0;
  let totalMiles = 0;
  let daysPerWeek = 0;
  let hasWeekend = false;
  const dest = new Set<string>();

  for (const l of legs) {
    const dCount = l.daysCount || 0;
    daysPerWeek += dCount;
    if (l.days.includes("Sat") || l.days.includes("Sun")) hasWeekend = true;
    if (l.hours != null) totalHours += l.hours * dCount;
    if (l.miles != null) totalMiles += l.miles * dCount;
    for (const t of l.routeTokens) if (t.kind === "location") dest.add(t.code);
  }

  return {
    bidNum,
    jobNum,
    startTime24,
    startTime12: to12Hour(startTime24),
    qualifications,
    legs,
    payType: classifyPayType(legs),
    totalHoursPerWeek: round2(totalHours),
    totalMilesPerWeek: round2(totalMiles),
    daysPerWeek,
    hasWeekend,
    destinations: Array.from(dest),
    estimatedWeeklyPay: 0,
    status: takers.length > 0 ? "taken" : "available",
    takenBy: takers[0] ?? null,
    takers,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function makeLeg(
  daysCol: string,
  routeCol: string,
  schedCol: string,
  qualOverride: string | null,
  startTimeOverride: string | null,
  defaultUnit: "hours" | "miles" = "hours",
): Leg {
  const parsedDays = parseDays(daysCol);
  const parsedRoute = parseRoute(routeCol);
  const parsedSched = parseSchedule(schedCol, defaultUnit);
  return {
    daysRaw: daysCol.trim(),
    days: parsedDays.days,
    daysCount: parsedDays.days.length,
    daysNote: parsedDays.note,
    routeRaw: routeCol.trim(),
    routeTokens: parsedRoute.tokens,
    scheduleRaw: schedCol.trim(),
    hours: parsedSched.hours,
    miles: parsedSched.miles,
    payNote: parsedRoute.payNote,
    qualOverride,
    startTimeOverride24: startTimeOverride
      ? normalizeTime24(startTimeOverride)
      : null,
  };
}

function appendRouteToLastLeg(leg: Leg, additional: string): Leg {
  const combined = (leg.routeRaw + additional).trim();
  const parsed = parseRoute(combined);
  return {
    ...leg,
    routeRaw: combined,
    routeTokens: parsed.tokens,
    payNote: parsed.payNote ?? leg.payNote,
  };
}

export function parseAnnualBidCsv(csvText: string): ParsedSheet {
  const warnings: string[] = [];
  const result = Papa.parse<string[]>(csvText, {
    skipEmptyLines: false,
  });
  const rows: string[][] = result.data.map((r) =>
    Array.isArray(r) ? r.map((c) => (c ?? "").toString()) : [],
  );

  const meta: SheetMeta = {
    title: rows[0]?.[0]?.trim() || null,
    notice: rows[1]?.[0]?.trim() || null,
    fetchedAt: Date.now(),
    source: "direct",
  };

  const headerIdx = findHeaderRow(rows);
  if (headerIdx === -1) {
    warnings.push("Could not locate header row containing 'Start Time'.");
    return { bids: [], meta, warnings };
  }

  const headerRow = rows[headerIdx] ?? [];
  const scheduleHeader = (headerRow[6] ?? "").toLowerCase();
  const defaultUnit: "hours" | "miles" = /miles?/.test(scheduleHeader)
    ? "miles"
    : "hours";

  const bids: Bid[] = [];
  let cur:
    | {
        bidNum: number;
        jobNum: string;
        startTime24: string;
        qualifications: string;
        legs: Leg[];
        takers: string[];
      }
    | null = null;

  const flush = () => {
    if (cur) {
      bids.push(
        buildBid(
          cur.bidNum,
          cur.jobNum,
          cur.startTime24,
          cur.qualifications,
          cur.legs,
          cur.takers,
        ),
      );
      cur = null;
    }
  };

  const addTaker = (raw: string) => {
    const t = extractTakenBy(raw);
    if (!t || !cur) return;
    if (!cur.takers.includes(t)) cur.takers.push(t);
  };

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isAllBlank(row)) {
      flush();
      continue;
    }

    const colA = (row[0] ?? "").trim();
    const colB = (row[1] ?? "").trim();
    const colC = (row[2] ?? "").trim();
    const colD = (row[3] ?? "").trim();
    const colE = (row[4] ?? "").trim();
    const colF = (row[5] ?? "").trim();
    const colG = (row[6] ?? "").trim();
    const colH = (row[7] ?? "").trim();

    const isNewBid = /^\d+$/.test(colA) && colC.length > 0;

    if (isNewBid) {
      flush();
      const time = normalizeTime24(colB) ?? colB;
      cur = {
        bidNum: Number(colA),
        jobNum: colC,
        startTime24: time,
        qualifications: colD,
        legs: [],
        takers: [],
      };
      addTaker(colH);
      if (colE || colF || colG) {
        cur.legs.push(makeLeg(colE, colF, colG, null, null, defaultUnit));
      }
      continue;
    }

    if (!cur) continue;

    addTaker(colH);

    const hasDays = colE.length > 0;
    const hasRoute = colF.length > 0;
    const hasSchedule = colG.length > 0;
    const hasQualOrTime = colB.length > 0 || colD.length > 0;

    if (hasDays || hasSchedule || (hasQualOrTime && hasRoute)) {
      cur.legs.push(
        makeLeg(
          colE,
          colF,
          colG,
          colD || null,
          colB || null,
          defaultUnit,
        ),
      );
    } else if (hasRoute && cur.legs.length > 0) {
      const last = cur.legs[cur.legs.length - 1];
      cur.legs[cur.legs.length - 1] = appendRouteToLastLeg(last, colF);
    }
  }
  flush();

  return { bids, meta, warnings };
}

export function parseSimpleTableCsv(csvText: string): SimpleTable {
  const result = Papa.parse<string[]>(csvText, { skipEmptyLines: false });
  const rows: string[][] = result.data.map((r) =>
    Array.isArray(r) ? r.map((c) => (c ?? "").toString()) : [],
  );

  let headerIdx = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i].some((c) => c && c.trim())) {
      headerIdx = i;
      break;
    }
  }
  const headers = (rows[headerIdx] ?? []).map((c) => c.trim());
  const data = rows
    .slice(headerIdx + 1)
    .filter((r) => r && r.some((c) => c && c.trim()))
    .map((r) => headers.map((_, idx) => (r[idx] ?? "").trim()));

  return {
    headers,
    rows: data,
    meta: { title: null, notice: null, fetchedAt: Date.now(), source: "direct" },
  };
}
