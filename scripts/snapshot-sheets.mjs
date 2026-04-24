#!/usr/bin/env node
// One-time snapshot of the 2026 bid sheet. Writes raw CSV + parsed JSON
// into src/data/snapshots/ so the deployed site no longer depends on the
// live Google Sheet. Re-run manually any time you want to refresh.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "src", "data", "snapshots");

const SHEET_ID = "1sIu6_ndtJRlmz-1gRRRBCudsLezPPJ0U";
const SHEETS = [
  { key: "toloh", gid: 1758902346, label: "Toledo Annual Bid" },
  { key: "nbloh", gid: 1635180906, label: "North Baltimore Annual Bid" },
  { key: "sleeper", gid: 1077520417, label: "Sleeper Team Bid" },
  { key: "seniority", gid: 2137587180, label: "Seniority" },
  { key: "bidTimes", gid: 1262154739, label: "Bid Times" },
  { key: "onCallToledo", gid: 1076391541, label: "On-Call Toledo" },
  { key: "onCallNbloh", gid: 1257999271, label: "On-Call N. Baltimore" },
];

async function fetchCsv(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text || text.length < 8) throw new Error("Empty response");
  return text;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const manifest = {
    spreadsheetId: SHEET_ID,
    capturedAt: new Date().toISOString(),
    sheets: [],
  };

  for (const s of SHEETS) {
    process.stdout.write(`  ${s.label.padEnd(28)} `);
    try {
      const csv = await fetchCsv(s.gid);
      const csvPath = resolve(OUT_DIR, `${s.key}.csv`);
      writeFileSync(csvPath, csv);
      manifest.sheets.push({
        key: s.key,
        label: s.label,
        gid: s.gid,
        bytes: csv.length,
        lines: csv.split("\n").length,
      });
      console.log(`✓ ${csv.length} bytes`);
    } catch (e) {
      console.log(`✗ ${e.message}`);
      manifest.sheets.push({
        key: s.key,
        label: s.label,
        gid: s.gid,
        error: e.message,
      });
    }
    // Be polite — avoid hammering the export endpoint.
    await new Promise((r) => setTimeout(r, 400));
  }

  const manifestPath = resolve(OUT_DIR, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nmanifest: ${manifestPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
