#!/usr/bin/env node
// Geocode every address in src/data/directory.generated.ts via Nominatim
// (OpenStreetMap's free geocoder) and write lat/lng back into the file.
// Respects Nominatim's 1 req/sec rate limit. Re-run after editing addresses.
//
//   node scripts/geocode-directory.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dirname, "..", "src", "data", "directory.generated.ts");

const USER_AGENT =
  "ToledoFeederBids/1.0 (contact: Devossam1@hotmail.com)";

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const hit = data[0];
  return { lat: Number(hit.lat), lng: Number(hit.lon) };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const src = readFileSync(FILE, "utf8");
  // Extract JSON payload between `const DIRECTORY: DirectoryRow[] = ` and `;`
  const m = src.match(
    /const DIRECTORY:\s*DirectoryRow\[\]\s*=\s*(\[[\s\S]*?\n\]);/,
  );
  if (!m) {
    console.error("Could not find DIRECTORY array in file.");
    process.exit(1);
  }
  const rows = JSON.parse(m[1]);

  let ok = 0;
  let skipped = 0;
  let fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.lat != null && r.lng != null) {
      skipped++;
      continue;
    }
    const query =
      r.address ||
      (r.state ? `${r.city}, ${r.state}, USA` : `${r.city}, USA`);
    try {
      const hit = await geocode(query);
      if (hit) {
        r.lat = hit.lat;
        r.lng = hit.lng;
        ok++;
        console.log(
          `  [${i + 1}/${rows.length}] ${r.code} → ${hit.lat.toFixed(4)}, ${hit.lng.toFixed(4)}`,
        );
      } else {
        fail++;
        console.log(`  [${i + 1}/${rows.length}] ${r.code} → NOT FOUND`);
      }
    } catch (e) {
      fail++;
      console.log(`  [${i + 1}/${rows.length}] ${r.code} → ERROR ${e.message}`);
    }
    // Polite delay — Nominatim asks for 1 req/sec max.
    await sleep(1100);
  }

  // Rebuild the file preserving type declarations around the JSON blob.
  const prefix = src.slice(0, m.index);
  const suffix = src.slice(m.index + m[0].length);
  const rebuilt =
    prefix +
    `const DIRECTORY: DirectoryRow[] = ${JSON.stringify(rows, null, 2)};` +
    suffix;
  writeFileSync(FILE, rebuilt);

  console.log(`\nDone — ok: ${ok}, skipped (already had coords): ${skipped}, failed: ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
