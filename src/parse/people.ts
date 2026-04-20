import Papa from "papaparse";

export type SeniorityRow = {
  rank: number;
  name: string;
  ftDate: string | null;
  ptDate: string | null;
  currentBid: string | null;
};

export type BidTimesRow = {
  rank: number;
  name: string;
  classification: string | null;
  ftDate: string | null;
  ptDate: string | null;
  vacationWeeks: string | null;
  callWindow: string | null;
};

export type OnCallRow = {
  position: number;
  driver: string | null;
  notes: string | null;
};

export type OnCallParsed = {
  hub: string | null;
  rows: OnCallRow[];
  notice: string | null;
};

function parseRows(csv: string): string[][] {
  const result = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  return result.data.map((r) =>
    Array.isArray(r) ? r.map((c) => (c ?? "").toString()) : [],
  );
}

const cleanCell = (v: string | undefined) =>
  (v ?? "").trim().replace(/\s+/g, " ") || null;

const isAllBlank = (row: string[]) => row.every((c) => !c || !c.trim());

export function parseSeniorityCsv(csv: string): SeniorityRow[] {
  const rows = parseRows(csv);
  const out: SeniorityRow[] = [];
  for (const row of rows) {
    if (!row || isAllBlank(row)) continue;
    const a = (row[0] ?? "").trim();
    if (!/^\d+$/.test(a)) continue;
    const rank = Number(a);
    const rawCol1 = cleanCell(row[1]);
    const currentBid =
      rawCol1 && /^[A-Z][A-Z0-9]{2,}$/.test(rawCol1) ? rawCol1 : null;
    const name = cleanCell(row[2]) ?? "";
    if (!name) continue;
    const ftDate = cleanCell(row[3]);
    const ptDate = cleanCell(row[4]);
    out.push({
      rank,
      name,
      ftDate,
      ptDate: ptDate === "-" ? null : ptDate,
      currentBid,
    });
  }
  return out;
}

export function parseBidTimesCsv(csv: string): BidTimesRow[] {
  const rows = parseRows(csv);
  const out: BidTimesRow[] = [];
  for (const row of rows) {
    if (!row || isAllBlank(row)) continue;
    const a = (row[0] ?? "").trim();
    if (!/^\d+$/.test(a)) continue;
    const rank = Number(a);
    const name = cleanCell(row[2]) ?? "";
    if (!name) continue;
    const classification = cleanCell(row[3]);
    const ftDate = cleanCell(row[4]);
    const ptDate = cleanCell(row[5]);
    const vacationWeeks = cleanCell(row[6]);
    const callWindow =
      cleanCell(row[8]) ?? cleanCell(row[7]) ?? cleanCell(row[9]);
    out.push({
      rank,
      name,
      classification,
      ftDate,
      ptDate: ptDate === "-" ? null : ptDate,
      vacationWeeks,
      callWindow,
    });
  }
  return out;
}

export function parseOnCallCsv(csv: string): OnCallParsed {
  const rows = parseRows(csv);
  let hub: string | null = null;
  let notice: string | null = null;
  const out: OnCallRow[] = [];

  for (const row of rows) {
    if (!row || isAllBlank(row)) continue;
    const a = (row[0] ?? "").trim();

    if (!notice && /forfeit/i.test(a)) notice = a;
    const hubMatch = a.match(/^([A-Z]{4,5})\s+On\s+Call$/i);
    if (hubMatch) {
      hub = hubMatch[1].toUpperCase();
      continue;
    }

    if (/^\d+$/.test(a)) {
      const position = Number(a);
      const driver =
        cleanCell(row[1]) ??
        cleanCell(row[2]) ??
        cleanCell(row[3]) ??
        null;
      const notes = cleanCell(row[4]) ?? cleanCell(row[5]);
      out.push({ position, driver, notes });
    }
  }
  return { hub, rows: out, notice };
}
