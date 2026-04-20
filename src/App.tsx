import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TopBar } from "./components/TopBar";
import { TabStrip } from "./components/TabStrip";
import { SettingsModal } from "./components/SettingsModal";
import { AnnualBidView } from "./views/AnnualBidView";
import { SeniorityView } from "./views/SeniorityView";
import { BidTimesView } from "./views/BidTimesView";
import { OnCallView } from "./views/OnCallView";
import { TAB_SOURCES, TabKey } from "./data/sources";
import { loadSettings, saveSettings, Settings } from "./data/settings";
import {
  loadLocations,
  saveLocations,
  LocationEntry,
} from "./data/locations";
import {
  loadTheme,
  saveTheme,
  applyTheme,
  resolveTheme,
  Theme,
} from "./data/theme";

export default function App() {
  const [params, setParams] = useSearchParams();
  const tabKey = (params.get("tab") as TabKey) || "toledo";
  const tab = TAB_SOURCES.find((t) => t.key === tabKey) ?? TAB_SOURCES[0];

  useEffect(() => {
    if (!params.get("tab")) {
      const next = new URLSearchParams(params);
      next.set("tab", "toledo");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [locations, setLocations] = useState<Record<string, LocationEntry>>(
    () => loadLocations(),
  );
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      if (prev === "system") return "dark";
      if (prev === "dark") return "light";
      return "system";
    });
  }, []);

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  const handleSaveSettings = useCallback((s: Settings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  const handleSaveLocation = useCallback(
    (code: string, name: string, confirmed: boolean) => {
      setLocations((prev) => {
        const next = { ...prev, [code]: { name, confirmed } };
        saveLocations(next);
        return next;
      });
    },
    [],
  );

  // Top-bar status reflects the currently visible tab. We re-trigger fetch by
  // changing the key on the inner view so a click on Refresh remounts useCsv.
  const [globalFetchedAt, setGlobalFetchedAt] = useState<number | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSource, setGlobalSource] = useState<string | null>(null);

  const childKey = useMemo(
    () => `${tabKey}-${refreshTick}`,
    [tabKey, refreshTick],
  );

  const reportStatus = useCallback(
    (s: {
      fetchedAt: number | null;
      loading: boolean;
      error: string | null;
      source: string | null;
    }) => {
      setGlobalFetchedAt(s.fetchedAt);
      setGlobalLoading(s.loading);
      setGlobalError(s.error);
      setGlobalSource(s.source);
    },
    [],
  );

  return (
    <div className="flex flex-col h-screen bg-bg-base text-slate-100">
      <TopBar
        fetchedAt={globalFetchedAt}
        loading={globalLoading}
        error={globalError}
        source={globalSource}
        theme={theme}
        resolvedTheme={resolvedTheme}
        onCycleTheme={cycleTheme}
        onRefresh={() => setRefreshTick((t) => t + 1)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <TabStrip />
      <div className="flex-1 flex flex-col overflow-hidden">
        {tab.kind === "annualBid" && (
          <AnnualBidView
            key={childKey}
            tab={tab}
            settings={settings}
            locations={locations}
            onSaveLocation={handleSaveLocation}
            onStatus={reportStatus}
          />
        )}
        {tab.kind === "seniority" && (
          <SeniorityView
            key={childKey}
            tab={tab}
            settings={settings}
            onStatus={reportStatus}
          />
        )}
        {tab.kind === "bidTimes" && (
          <BidTimesView
            key={childKey}
            tab={tab}
            settings={settings}
            onStatus={reportStatus}
          />
        )}
        {tab.kind === "onCall" && (
          <OnCallView
            key={childKey}
            tab={tab}
            settings={settings}
            onStatus={reportStatus}
          />
        )}
      </div>

      <SettingsModal
        open={settingsOpen}
        initial={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
