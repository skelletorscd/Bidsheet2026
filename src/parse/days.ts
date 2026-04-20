import { DayCode, DAY_ORDER } from "../types";

const DAY_ALIASES: Record<string, DayCode> = {
  mon: "Mon",
  monday: "Mon",
  tue: "Tue",
  tues: "Tue",
  tuesday: "Tue",
  wed: "Wed",
  weds: "Wed",
  wednesday: "Wed",
  thu: "Thu",
  thur: "Thu",
  thurs: "Thu",
  thursday: "Thu",
  fri: "Fri",
  friday: "Fri",
  sat: "Sat",
  saturday: "Sat",
  sun: "Sun",
  sunday: "Sun",
};

function dayFromToken(token: string): DayCode | null {
  return DAY_ALIASES[token.trim().toLowerCase()] ?? null;
}

function expandRange(start: DayCode, end: DayCode): DayCode[] {
  const startIdx = DAY_ORDER.indexOf(start);
  const endIdx = DAY_ORDER.indexOf(end);
  if (startIdx === -1 || endIdx === -1) return [];
  if (endIdx >= startIdx) return DAY_ORDER.slice(startIdx, endIdx + 1);
  return [...DAY_ORDER.slice(startIdx), ...DAY_ORDER.slice(0, endIdx + 1)];
}

export type ParsedDays = {
  days: DayCode[];
  note: string | null;
};

export function parseDays(raw: string): ParsedDays {
  if (!raw) return { days: [], note: null };
  let cleaned = raw.trim();

  let note: string | null = null;
  const noteMatch = cleaned.match(/\(([^)]+)\)/);
  if (noteMatch) {
    note = noteMatch[1].trim();
    cleaned = cleaned.replace(noteMatch[0], "").trim();
  }

  const days = new Set<DayCode>();

  for (const segment of cleaned.split(",")) {
    const seg = segment.trim();
    if (!seg) continue;

    const rangeMatch = seg.split(/\s*-\s*/);
    if (rangeMatch.length === 2) {
      const start = dayFromToken(rangeMatch[0]);
      const end = dayFromToken(rangeMatch[1]);
      if (start && end) {
        for (const d of expandRange(start, end)) days.add(d);
        continue;
      }
    }

    const single = dayFromToken(seg);
    if (single) days.add(single);
  }

  const ordered = DAY_ORDER.filter((d) => days.has(d));
  return { days: ordered, note };
}
