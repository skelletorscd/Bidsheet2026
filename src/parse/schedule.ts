export type ParsedSchedule = {
  hours: number | null;
  miles: number | null;
};

export function parseSchedule(
  raw: string,
  defaultUnit: "hours" | "miles" = "hours",
): ParsedSchedule {
  if (!raw) return { hours: null, miles: null };
  const trimmed = raw.trim();

  const milesMatch = trimmed.match(/([\d,]+(?:\.\d+)?)\s*miles?/i);
  if (milesMatch) {
    return { hours: null, miles: stripCommas(milesMatch[1]) };
  }

  const cleaned = trimmed.replace(/,/g, "");
  const num = Number(cleaned);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return defaultUnit === "miles"
      ? { hours: null, miles: num }
      : { hours: num, miles: null };
  }
  return { hours: null, miles: null };
}

function stripCommas(s: string): number {
  return Number(s.replace(/,/g, ""));
}
