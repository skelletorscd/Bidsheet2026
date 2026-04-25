// Sticky bottom-right floater that surfaces the current route while the
// driver is browsing the Locations directory. Always visible whenever
// the shared draft has at least one stop, so it's never a mystery what's
// being built.

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Navigation,
  Route,
  Trash2,
  X,
} from "lucide-react";
import { useRouteDraft } from "../data/useRouteDraft";
import { DIRECTORY, DirectoryRow } from "../data/directory.generated";
import { googleMapsUrl, isRoutable } from "./RouteBuilder";

const BY_CODE: Record<string, DirectoryRow> = Object.fromEntries(
  DIRECTORY.map((r) => [r.code, r]),
);

export function RouteFloater() {
  const draft = useRouteDraft();
  const [expanded, setExpanded] = useState(false);

  if (draft.stops.length === 0) return null;

  return (
    <div
      className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:w-[360px] z-30 pointer-events-auto"
      style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgb(var(--bg-panel) / 0.85)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          border: "1px solid rgb(245 158 11 / 0.4)",
          boxShadow:
            "0 25px 60px -20px rgb(0 0 0 / 0.5), 0 0 0 1px rgb(255 255 255 / 0.04) inset",
        }}
      >
        {expanded && <ExpandedList />}

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgb(245 158 11 / 0.35), rgb(244 114 182 / 0.3))",
              border: "1px solid rgb(245 158 11 / 0.55)",
            }}
          >
            <Route className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[10px] uppercase tracking-[0.3em] font-bold"
              style={{ color: "rgb(var(--fg-faint))" }}
            >
              Today's route
            </div>
            <div
              className="font-semibold text-[14px] tracking-tight truncate"
              style={{ color: "rgb(var(--fg))" }}
            >
              {draft.stops.length} stop{draft.stops.length === 1 ? "" : "s"} ·
              tap to {expanded ? "collapse" : "review"}
            </div>
          </div>
          <ChevronUp
            className={`w-4 h-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            style={{ color: "rgb(var(--fg-faint))" }}
          />
        </button>

        <div className="flex border-t" style={{ borderColor: "rgb(var(--border) / 0.08)" }}>
          <button
            type="button"
            onClick={() => draft.clear()}
            className="px-4 py-2.5 text-[12px] font-medium transition-colors hover:text-rose-300"
            style={{ color: "rgb(var(--fg-faint))" }}
          >
            <X className="w-3.5 h-3.5 inline mr-1" />
            Clear
          </button>
          {(() => {
            const validCount = draft.stops.filter(isRoutable).length;
            const disabled = validCount < 2;
            return (
              <a
                href={googleMapsUrl(draft.stops)}
                target="_blank"
                rel="noreferrer"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 font-bold text-sm transition-all ${
                  disabled
                    ? "opacity-40 pointer-events-none"
                    : "hover:bg-amber-500/15"
                }`}
                style={{ color: "rgb(252 211 77)" }}
                title={
                  disabled
                    ? "Need at least 2 stops with a real address"
                    : undefined
                }
              >
                <Navigation className="w-4 h-4" />
                Open in Google Maps
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function ExpandedList() {
  const draft = useRouteDraft();

  return (
    <ol
      className="max-h-[40vh] overflow-y-auto py-2 px-3 space-y-0 border-b"
      style={{ borderColor: "rgb(var(--border) / 0.08)" }}
    >
      {draft.stops.map((stop, i) => {
        const isCustom = stop.kind === "custom";
        const row =
          stop.kind === "directory" ? BY_CODE[stop.code] : null;
        const last = i === draft.stops.length - 1;
        const title =
          isCustom
            ? (stop as { label: string }).label
            : `${(stop as { code: string }).code} · ${row?.city ?? ""}${
                row?.state ? `, ${row.state}` : ""
              }`;
        return (
          <li key={i}>
            <div
              className="flex items-center gap-2 py-1.5"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold tabular shrink-0"
                style={{
                  background: isCustom
                    ? "rgb(168 85 247 / 0.3)"
                    : "rgb(245 158 11 / 0.3)",
                  color: isCustom ? "rgb(233 213 255)" : "rgb(252 211 77)",
                  border: isCustom
                    ? "1px solid rgb(168 85 247 / 0.5)"
                    : "1px solid rgb(245 158 11 / 0.55)",
                }}
              >
                {i + 1}
              </div>
              <span
                className="flex-1 truncate text-[12px]"
                style={{ color: "rgb(var(--fg))" }}
              >
                {title}
              </span>
              <button
                type="button"
                onClick={() => draft.move(i, -1)}
                disabled={i === 0}
                className="p-1 rounded text-slate-400 hover:text-amber-300 disabled:opacity-30"
                aria-label="Move up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => draft.move(i, 1)}
                disabled={i === draft.stops.length - 1}
                className="p-1 rounded text-slate-400 hover:text-amber-300 disabled:opacity-30"
                aria-label="Move down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => draft.remove(i)}
                className="p-1 rounded text-slate-400 hover:text-rose-300"
                aria-label="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {!last && (
              <div className="flex justify-start pl-3">
                <ChevronDown
                  className="w-3 h-3"
                  style={{ color: "rgb(245 158 11 / 0.5)" }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
