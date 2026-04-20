import { ChevronRight } from "lucide-react";
import { RouteToken } from "../types";
import { LocationEntry } from "../data/locations";

type Props = {
  tokens: RouteToken[];
  locations: Record<string, LocationEntry>;
  onClickUnknown?: (code: string) => void;
  compact?: boolean;
};

export function RouteRender({
  tokens,
  locations,
  onClickUnknown,
  compact = false,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1 leading-snug">
      {tokens.map((t, i) => {
        const sep =
          i > 0 ? (
            <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          ) : null;
        if (t.kind === "location") {
          const entry = locations[t.code];
          const name = entry?.name && entry.name !== "?" ? entry.name : null;
          const known = !!name;
          return (
            <span key={i} className="contents">
              {sep}
              <span
                className={`inline-flex items-center gap-1 ${
                  known
                    ? "text-slate-200"
                    : "text-amber-300 cursor-pointer hover:underline"
                }`}
                title={name ?? "Unknown location — click to add"}
                onClick={() => !known && onClickUnknown?.(t.code)}
              >
                <span className="font-mono text-[12px] font-semibold tabular bg-slate-800/60 px-1.5 py-[1px] rounded">
                  {t.code}
                </span>
                {!compact && name && (
                  <span className="text-[12px] text-slate-400 hidden lg:inline">
                    {name}
                  </span>
                )}
                {!known && <span className="text-amber-400">●</span>}
              </span>
            </span>
          );
        }
        if (t.kind === "trailer") {
          return (
            <span key={i} className="contents">
              {sep}
              <span className="pill bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Trailer #{t.num}
              </span>
            </span>
          );
        }
        if (t.kind === "special") {
          return (
            <span key={i} className="contents">
              {sep}
              <span className="italic text-[12px] text-slate-400">
                {t.text}
              </span>
            </span>
          );
        }
        return (
          <span key={i} className="contents">
            {sep}
            <span className="text-[12px] text-slate-500">{t.text}</span>
          </span>
        );
      })}
    </div>
  );
}
