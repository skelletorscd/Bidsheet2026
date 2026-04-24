import { Monitor, Moon, RefreshCw, Settings, Sun, Truck } from "lucide-react";
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
  loading,
  theme,
  resolvedTheme,
  onCycleTheme,
  onRefresh,
  onOpenSettings,
}: Props) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-2xl" style={{ background: "rgb(var(--bg-base) / 0.65)" }}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 h-14 flex items-center gap-2 sm:gap-3 border-b" style={{ borderColor: "rgb(var(--border) / 0.08)" }}>
        <div className="flex items-center gap-2.5 mr-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
            <Truck className="w-4.5 h-4.5 text-bg-base" style={{ color: "#0a0b14" }} />
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-[15px] font-semibold whitespace-nowrap tracking-tight" style={{ color: "rgb(var(--fg))" }}>
              Feeder Bids 2026
            </div>
            <div className="hidden sm:block text-[11px] tabular whitespace-nowrap" style={{ color: "rgb(var(--fg-faint))" }}>
              Toledo · North Baltimore
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <IconButton onClick={onRefresh} disabled={loading} label="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </IconButton>

        <IconButton onClick={onCycleTheme} label={themeTooltip(theme, resolvedTheme)}>
          {theme === "system" ? (
            <Monitor className="w-4 h-4" />
          ) : resolvedTheme === "light" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </IconButton>

        <IconButton onClick={onOpenSettings} label="Settings">
          <Settings className="w-4 h-4" />
        </IconButton>
      </div>
    </header>
  );
}

function IconButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
      style={{
        background: "rgb(var(--bg-raised) / 0.35)",
        color: "rgb(var(--fg-muted))",
        border: "1px solid rgb(var(--border) / 0.1)",
        backdropFilter: "blur(12px)",
      }}
    >
      {children}
    </button>
  );
}

function themeTooltip(theme: Theme, resolved: "dark" | "light"): string {
  if (theme === "system") return `Theme: system (${resolved})`;
  return `Theme: ${theme}`;
}
