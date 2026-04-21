import { Monitor, Moon, RefreshCw, Settings, Sun, Truck } from "lucide-react";
import { StatusDot } from "./StatusDot";
import { formatRelative } from "../util/format";
import { Theme } from "../data/theme";

type Props = {
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
  source: string | null;
  theme: Theme;
  resolvedTheme: "dark" | "light";
  onCycleTheme: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
};

export function TopBar({
  fetchedAt,
  loading,
  error,
  source,
  theme,
  resolvedTheme,
  onCycleTheme,
  onRefresh,
  onOpenSettings,
}: Props) {
  const state: "live" | "stale" | "error" | "loading" = error
    ? "error"
    : loading
      ? "loading"
      : source === "cache"
        ? "stale"
        : "live";

  const label = error
    ? "Fetch error"
    : loading
      ? "Refreshing…"
      : source === "cache"
        ? "Cached"
        : source === "paste"
          ? "Pasted CSV"
          : "Live";

  return (
    <header className="sticky top-0 z-30 bg-bg-base/85 backdrop-blur border-b border-border-subtle">
      <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Truck className="w-4 h-4 text-amber-300" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-slate-100">
              Feeder Bids 2026
            </div>
            <div className="text-[11px] text-slate-400 tabular">
              Toledo · North Baltimore
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <StatusDot state={state} />
          <span className="text-slate-300">{label}</span>
          <span className="text-slate-500">·</span>
          <span className="tabular">updated {formatRelative(fetchedAt)}</span>
        </div>

        <button
          className="btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh now"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <button
          className="btn"
          onClick={onCycleTheme}
          title={themeTooltip(theme, resolvedTheme)}
          aria-label={themeTooltip(theme, resolvedTheme)}
        >
          {theme === "system" ? (
            <Monitor className="w-4 h-4" />
          ) : resolvedTheme === "light" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        <button
          className="btn"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function themeTooltip(theme: Theme, resolved: "dark" | "light"): string {
  if (theme === "system") return `Theme: system (${resolved})`;
  return `Theme: ${theme}`;
}
