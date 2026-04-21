#!/usr/bin/env node
// Refetches the UPS feeder location directory sheet and regenerates
// src/data/directory.generated.ts. Run manually when the sheet changes.
//
//   node scripts/bake-directory.mjs
//
// Requires the shared sheet to be fetchable via the Google Sheets CSV export
// (either publicly-shared or cached via `corsproxy.io` — we try both).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Papa from "papaparse";

const SHEET_ID = "1galcmWPIebIldCrt9aKmisIMGf7iabXIPcIX6nuiWTE";
const GID = 0;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "src", "data", "directory.generated.ts");

const DIRECT = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
const PROXY = `https://corsproxy.io/?${encodeURIComponent(DIRECT)}`;

async function fetchCsv() {
  for (const url of [DIRECT, PROXY]) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text || /^<!doctype html/i.test(text.slice(0, 32))) continue;
      return text;
    } catch {
      // try next
    }
  }
  // Fall back to a locally-cached copy if someone piped one in.
  try {
    return readFileSync("/tmp/loc_sheet.csv", "utf8");
  } catch {
    throw new Error(
      "Could not fetch the directory sheet. Share it as 'anyone with link'.",
    );
  }
}

function parse(csv) {
  const rows = Papa.parse(csv, { skipEmptyLines: false }).data;
  const out = [];
  let category = "center";
  let sawHeader = false;
  for (const r of rows) {
    const city = (r[0] ?? "").trim();
    const code = (r[2] ?? "").trim().toUpperCase();
    if (/letter\s*code/i.test(r[2] ?? "")) {
      sawHeader = true;
      if (/airport/i.test(city)) category = "airport";
      else if (/toll/i.test(city)) category = "toll";
      else category = "center";
      continue;
    }
    if (!sawHeader) continue;
    if (!code || !/^[A-Z][A-Z0-9]{3,5}$/.test(code)) continue;
    out.push({
      code,
      city,
      state: (r[1] ?? "").trim() || null,
      slic: (r[3] ?? "").trim() || null,
      address: ((r[5] ?? "").replace(/\s+/g, " ").trim()) || null,
      phone: ((r[6] ?? "").replace(/\s+/g, " ").trim()) || null,
      notes: ((r[7] ?? "").replace(/\s+/g, " ").trim()) || null,
      category,
    });
  }
  return out;
}

const csv = await fetchCsv();
const data = parse(csv);

let ts = `// AUTO-GENERATED from the UPS feeder location directory sheet.
// Regenerate by running \`node scripts/bake-directory.mjs\` if the sheet changes.
export type DirectoryCategory = "center" | "airport" | "toll";

export type DirectoryRow = {
  code: string;
  city: string;
  state: string | null;
  slic: string | null;
  address: string | null;
  phone: string | null;
  notes: string | null;
  category: DirectoryCategory;
};

export const DIRECTORY: DirectoryRow[] = ${JSON.stringify(data, null, 2)};

export const DIRECTORY_BY_CODE: Record<string, DirectoryRow> = Object.fromEntries(
  DIRECTORY.map((r) => [r.code, r]),
);
`;

writeFileSync(OUT, ts);
console.log(`wrote ${OUT} — ${data.length} rows`);
