export function parseDateMDY(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-") return null;
  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let year = Number(m[3]);
  if (year < 100) year += year < 50 ? 2000 : 1900;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function yearsSince(date: Date | null, now: Date = new Date()): number {
  if (!date) return 0;
  let years = now.getFullYear() - date.getFullYear();
  const mDiff = now.getMonth() - date.getMonth();
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < date.getDate())) years--;
  return years;
}

export function formatYears(n: number): string {
  return `${n} year${n === 1 ? "" : "s"}`;
}

export function formatCallWindow(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const times = Array.from(raw.matchAll(/\b(\d{3,4})\b/g))
    .map((m) => m[1])
    .filter((s) => /^\d{3,4}$/.test(s) && Number(s) <= 2400);

  if (times.length < 2) return raw;

  const [startRaw, endRaw] = times.slice(-2);
  const start = to12hLower(startRaw);
  const end = to12hLower(endRaw);
  if (!start || !end) return raw;

  const dateMatch = raw.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}/i,
  );
  if (dateMatch) {
    return `${shortDate(dateMatch[0])} · ${start}-${end}`;
  }
  return `${start}-${end}`;
}

function to12hLower(mil: string): string | null {
  const padded = mil.padStart(4, "0");
  const h = Number(padded.slice(0, 2));
  const m = padded.slice(2, 4);
  if (Number.isNaN(h) || h > 24) return null;
  const period = h >= 12 && h < 24 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${period}`;
}

const MONTH_SHORT: Record<string, string> = {
  jan: "Jan",
  feb: "Feb",
  mar: "Mar",
  apr: "Apr",
  may: "May",
  jun: "Jun",
  jul: "Jul",
  aug: "Aug",
  sep: "Sep",
  sept: "Sep",
  oct: "Oct",
  nov: "Nov",
  dec: "Dec",
};

function shortDate(match: string): string {
  const m = match.match(/^([a-z]+)\.?\s+(\d{1,2})/i);
  if (!m) return match;
  const short = MONTH_SHORT[m[1].toLowerCase()] ?? m[1];
  return `${short} ${m[2]}`;
}
