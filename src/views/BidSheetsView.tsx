import { useEffect, useState } from "react";
import { Building2, FileText, Truck } from "lucide-react";
import { SNAPSHOT_CSV } from "../data/snapshots";

type Props = {
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
};

type SheetKey = "toloh" | "nbloh" | "sleeper";

const SHEETS: {
  key: SheetKey;
  label: string;
  hubLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  { key: "toloh", label: "Toledo", hubLabel: "Toledo, OH", icon: Building2, accent: "amber" },
  { key: "nbloh", label: "North Baltimore", hubLabel: "N. Baltimore, OH", icon: Building2, accent: "emerald" },
  { key: "sleeper", label: "Sleeper Teams", hubLabel: "Team routes", icon: Truck, accent: "sky" },
];

export function BidSheetsView({ onStatus }: Props) {
  const [active, setActive] = useState<SheetKey>("toloh");

  useEffect(() => {
    onStatus({
      fetchedAt: Date.now(),
      loading: false,
      error: null,
      source: "snapshot",
    });
  }, [onStatus]);

  const sheet = SHEETS.find((s) => s.key === active)!;
  const csv = SNAPSHOT_CSV[active];
  const rows = parseCsv(csv);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-amber-300 font-bold">
            <FileText className="w-3.5 h-3.5" />
            Annual bid notice
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-100">
            Bid sheets
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            The full raw annual bid notice as posted — each hub on its own tab.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {SHEETS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                active === s.key
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-200 font-semibold"
                  : "border-border text-slate-300 hover:bg-bg-hover"
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        <div className="card overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  className={`border-b border-border-subtle ${ri === 0 ? "font-bold text-slate-100" : ""} ${ri <= 1 ? "bg-bg-raised/40" : ""}`}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-1.5 align-top whitespace-nowrap ${ci === 0 ? "text-slate-500 tabular w-10 text-right" : "text-slate-200"} ${ci === 7 && cell ? "text-amber-300 font-semibold" : ""}`}
                    >
                      {cell || (ri > 1 ? "" : "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-500 mt-3">
          Showing {rows.length} rows from the {sheet.hubLabel} sheet. Names in
          amber are the drivers who took that bid.
        </p>
      </div>
    </div>
  );
}

// Lightweight CSV parser sufficient for preview (real parsing uses papaparse
// elsewhere, but for pure display we just split on lines / commas ignoring
// quoted strings).
function parseCsv(csv: string): string[][] {
  const out: string[][] = [];
  const lines = csv.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    const row: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === "," && !inQ) {
        row.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    row.push(cur);
    out.push(row);
  }
  return out;
}
