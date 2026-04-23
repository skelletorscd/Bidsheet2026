export type DayCode = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export const DAY_ORDER: DayCode[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

export type RouteToken =
  | { kind: "location"; code: string }
  | { kind: "trailer"; num: string }
  | { kind: "special"; text: string }
  | { kind: "note"; text: string };

export type Leg = {
  daysRaw: string;
  days: DayCode[];
  daysCount: number;
  daysNote: string | null;
  routeRaw: string;
  routeTokens: RouteToken[];
  scheduleRaw: string;
  hours: number | null;
  miles: number | null;
  payNote: string | null;
  qualOverride: string | null;
  startTimeOverride24: string | null;
};

export type BidStatus = "available" | "in-progress" | "taken";

export type Bid = {
  bidNum: number;
  jobNum: string;
  startTime24: string;
  startTime12: string;
  qualifications: string;
  legs: Leg[];

  payType: "hourly" | "mileage" | "mixed" | "unknown";
  totalHoursPerWeek: number;
  totalMilesPerWeek: number;
  daysPerWeek: number;
  hasWeekend: boolean;
  destinations: string[];
  estimatedWeeklyPay: number;
  status: BidStatus;
  /** First driver name (kept for back-compat with display code). */
  takenBy: string | null;
  /** Every driver tied to this bid — sleeper teams have two (A + B slot). */
  takers: string[];
};

export type SheetMeta = {
  title: string | null;
  notice: string | null;
  fetchedAt: number;
  source: "direct" | "proxy" | "paste" | "cache";
};

export type ParsedSheet = {
  bids: Bid[];
  meta: SheetMeta;
  warnings: string[];
};

export type SimpleTable = {
  headers: string[];
  rows: string[][];
  meta: SheetMeta;
};
