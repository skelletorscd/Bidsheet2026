import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TopBar } from "./components/TopBar";
import { TabStrip } from "./components/TabStrip";
import { SettingsModal } from "./components/SettingsModal";
import { AnnualBidView } from "./views/AnnualBidView";
import { SeniorityView } from "./views/SeniorityView";
import { BidTimesView } from "./views/BidTimesView";
import { OnCallView } from "./views/OnCallView";
import { CelebrationStack } from "./components/CelebrationStack";
import { GlobalCountsStrip } from "./components/GlobalCountsStrip";
import { ScheduledReplayBanner } from "./components/ScheduledReplayBanner";
import { useTakenBids } from "./data/useTakenBids";
import { useBidTakenToasts } from "./data/useBidTakenToasts";
import { useGlobalCounts } from "./data/useGlobalCounts";
import { useScheduledCelebration } from "./data/useScheduledCelebration";
import { LocationsView } from "./views/LocationsView";
import { ContactView } from "./views/ContactView";
import { NowBiddingView } from "./views/NowBiddingView";
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
import { loadSoundOn, saveSoundOn } from "./data/sound-pref";
import { primeAudio, setSoundMuted } from "./util/sounds";

export default function App() {
  const [params, setParams] = useSearchParams();
  const tabKey = (params.get("tab") as TabKey) || "nowBidding";
  const tab = TAB_SOURCES.find((t) => t.key === tabKey) ?? TAB_SOURCES[0];

  useEffect(() => {
    if (!params.get("tab")) {
      const next = new URLSearchParams(params);
      next.set("tab", "nowBidding");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [locations, setLocations] = useState<Record<string, LocationEntry>>(
    () => loadLocations(),
  );
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [soundOn, setSoundOn] = useState<boolean>(() => loadSoundOn());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Push the sound preference into the audio system; persist to localStorage.
  useEffect(() => {
    setSoundMuted(!soundOn);
    saveSoundOn(soundOn);
  }, [soundOn]);

  // Browsers block AudioContext until a user gesture. Prime it on the first
  // pointer/key event so the very first celebration can play sound.
  useEffect(() => {
    const prime = () => {
      primeAudio();
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
    window.addEventListener("pointerdown", prime);
    window.addEventListener("keydown", prime);
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      // Toggling sound on counts as a user gesture — safe to prime now.
      if (next) primeAudio();
      return next;
    });
  }, []);

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

  const takenBids = useTakenBids(settings);
  const { toasts, dismiss: dismissToast } = useBidTakenToasts(
    takenBids.taken,
    takenBids.loading,
  );
  const globalCounts = useGlobalCounts(settings);
  const replay = useScheduledCelebration(settings);

  // Merge any scheduled-replay toasts into the celebration queue.
  const allToasts = useMemo(
    () => [...toasts, ...replay.newToasts],
    [toasts, replay.newToasts],
  );
  useEffect(() => {
    if (replay.newToasts.length > 0) replay.consume();
  }, [replay]);

  // `locations` already merges the baked directory (via SEED_LOCATIONS in
  // loadLocations) with any user overrides in localStorage.
  const mergedLocations = locations;

  const handleSaveSettings = useCallback((s: Settings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  const handleSaveLocation = useCallback(
    (
      code: string,
      name: string,
      address: string | undefined,
      confirmed: boolean,
    ) => {
      setLocations((prev) => {
        const next = {
          ...prev,
          [code]: { ...prev[code], name, address, confirmed },
        };
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
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onCycleTheme={cycleTheme}
        onRefresh={() => setRefreshTick((t) => t + 1)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <ScheduledReplayBanner scheduled={replay.scheduled} />
      <GlobalCountsStrip counts={globalCounts} />
      <TabStrip />
      <div className="flex-1 flex flex-col overflow-hidden">
        {tab.kind === "annualBid" && (
          <AnnualBidView
            key={childKey}
            tab={tab}
            settings={settings}
            locations={mergedLocations}
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
        {tab.kind === "locations" && (
          <LocationsView key={childKey} onStatus={reportStatus} />
        )}
        {tab.kind === "contact" && (
          <ContactView key={childKey} onStatus={reportStatus} />
        )}
        {tab.kind === "nowBidding" && (
          <NowBiddingView
            key={childKey}
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

      <CelebrationStack toasts={allToasts} onDismiss={dismissToast} />
    </div>
  );
}
