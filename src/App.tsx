import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TopBar } from "./components/TopBar";
import { TabStrip } from "./components/TabStrip";
import { SettingsModal } from "./components/SettingsModal";
import { GlobalCountsStrip } from "./components/GlobalCountsStrip";
import { useGlobalCounts } from "./data/useGlobalCounts";
import { LocationsView } from "./views/LocationsView";
import { ContactView } from "./views/ContactView";
import { DashboardView } from "./views/DashboardView";
import { RosterView } from "./views/RosterView";
import { BidSheetsView } from "./views/BidSheetsView";
import { OnCallHubView } from "./views/OnCallHubView";
import { AccountView } from "./views/AccountView";
import { AuthModal } from "./components/AuthModal";
import { PasswordResetModal } from "./components/PasswordResetModal";
import { useSession } from "./data/useSession";
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
  const tabKey = (params.get("tab") as TabKey) || "dashboard";
  const tab = TAB_SOURCES.find((t) => t.key === tabKey) ?? TAB_SOURCES[0];

  useEffect(() => {
    if (!params.get("tab")) {
      const next = new URLSearchParams(params);
      next.set("tab", "dashboard");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [locations, setLocations] = useState<Record<string, LocationEntry>>(
    () => loadLocations(),
  );
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [resetDone, setResetDone] = useState(false);

  // Detects ?recovery=1 OR a #access_token=... hash dropped in by the
  // Supabase password-reset email. If PASSWORD_RECOVERY fires we pop a
  // modal that blocks everything until they pick a new password.
  const session = useSession();
  const showReset = session.recoveryMode && !resetDone;

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

  const globalCounts = useGlobalCounts();

  const handleSaveSettings = useCallback((s: Settings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  // Retained for when a location-edit flow is surfaced again.
  void locations;
  void setLocations;
  void saveLocations;

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
      <GlobalCountsStrip counts={globalCounts} />
      <TabStrip />
      <div className="flex-1 flex flex-col overflow-hidden">
        {tab.kind === "dashboard" && (
          <DashboardView key={childKey} onStatus={reportStatus} />
        )}
        {tab.kind === "seniority" && (
          <RosterView key={childKey} onStatus={reportStatus} />
        )}
        {tab.kind === "bidSheet" && (
          <BidSheetsView key={childKey} onStatus={reportStatus} />
        )}
        {tab.kind === "onCallHub" && (
          <OnCallHubView key={childKey} tab={tab} onStatus={reportStatus} />
        )}
        {tab.kind === "locations" && (
          <LocationsView key={childKey} onStatus={reportStatus} />
        )}
        {tab.kind === "contact" && (
          <ContactView key={childKey} onStatus={reportStatus} />
        )}
        {tab.kind === "account" && (
          <AccountView
            key={childKey}
            onStatus={reportStatus}
            onOpenAuth={() => setAuthOpen(true)}
          />
        )}
      </div>

      <SettingsModal
        open={settingsOpen}
        initial={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      {showReset && (
        <PasswordResetModal
          onDone={() => {
            setResetDone(true);
            // Clean the recovery marker from the URL so reloads don't re-prompt.
            const url = new URL(window.location.href);
            url.searchParams.delete("recovery");
            url.hash = "";
            window.history.replaceState(null, "", url.toString());
          }}
        />
      )}
    </div>
  );
}
