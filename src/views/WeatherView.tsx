import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  Loader2,
  Wind,
} from "lucide-react";
import {
  CurrentWeather,
  fetchWeather,
  fetchRadarFrames,
  fetchAlerts,
  RadarFrame,
  WeatherAlert,
  WeatherForecast,
  weatherInfo,
} from "../data/weather";
import { DIRECTORY } from "../data/directory.generated";

type Props = {
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
};

// Lazy-load Leaflet just like the route map does — keeps the initial bundle
// small for users who never open the Weather tab.
const WeatherMap = lazy(() =>
  import("./WeatherMap").then((m) => ({ default: m.WeatherMap })),
);

const TOLOH = DIRECTORY.find((r) => r.code === "TOLOH");
const NBLOH = DIRECTORY.find((r) => r.code === "NBLOH");

const HUBS = [
  {
    code: "TOL",
    label: "Toledo, OH",
    lat: TOLOH?.lat ?? 41.5822,
    lng: TOLOH?.lng ?? -83.6678,
  },
  {
    code: "NBL",
    label: "North Baltimore, OH",
    lat: NBLOH?.lat ?? 41.183,
    lng: NBLOH?.lng ?? -83.696,
  },
] as const;

// States feeder routes touch most often — covers ≥99% of bid destinations.
const ALERT_STATES = ["OH", "MI", "PA", "IN", "IL", "KY", "WV", "NY"];

export function WeatherView({ onStatus }: Props) {
  const [forecasts, setForecasts] = useState<
    Record<string, WeatherForecast | null>
  >({});
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onStatus({
      fetchedAt: Date.now(),
      loading: false,
      error: null,
      source: "open-meteo",
    });
  }, [onStatus]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [tol, nbl, fr, al] = await Promise.all([
          fetchWeather(HUBS[0].lat, HUBS[0].lng),
          fetchWeather(HUBS[1].lat, HUBS[1].lng),
          fetchRadarFrames().catch(() => [] as RadarFrame[]),
          fetchAlerts(ALERT_STATES).catch(() => [] as WeatherAlert[]),
        ]);
        if (!active) return;
        setForecasts({ TOL: tol, NBL: nbl });
        setFrames(fr);
        setAlerts(al);
        setError(null);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const feederAlerts = useMemo(
    () =>
      alerts.filter((a) =>
        ["Severe", "Extreme"].includes(a.severity) ||
        /storm|tornado|warning|advisory|winter|ice|flood|fog/i.test(a.event),
      ),
    [alerts],
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.4em] font-bold text-amber-300">
            Weather
          </div>
          <h1
            className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: "rgb(var(--fg))" }}
          >
            Radar, alerts, and what's coming
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "rgb(var(--fg-subtle))" }}
          >
            See what's coming before you pull out of the yard. Live radar
            sweeps the whole feeder area, severe-weather warnings drop in
            on the map (and listed below — tap any one for the full
            advisory), and the cards underneath give you Toledo and North
            Baltimore at a glance.
          </p>
        </div>

        {error && (
          <div className="card p-3 text-rose-300 text-xs flex items-start gap-2 border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Couldn't load weather: {error}</span>
          </div>
        )}

        {/* Map */}
        <div className="card overflow-hidden p-0">
          <Suspense
            fallback={
              <div className="h-[360px] flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
              </div>
            }
          >
            <WeatherMap
              hubs={HUBS}
              radarFrames={frames}
              alerts={feederAlerts}
            />
          </Suspense>
        </div>

        {/* Per-hub current cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HUBS.map((h) => (
            <HubCard key={h.code} hub={h} forecast={forecasts[h.code] ?? null} />
          ))}
        </div>

        {/* Active alerts list */}
        {feederAlerts.length > 0 && (
          <section className="card p-4">
            <h2
              className="text-[11px] uppercase tracking-[0.3em] font-bold mb-3 flex items-center gap-1.5"
              style={{ color: "rgb(var(--fg-faint))" }}
            >
              <AlertTriangle className="w-3 h-3 text-rose-300" />
              {feederAlerts.length} active alert
              {feederAlerts.length === 1 ? "" : "s"}
            </h2>
            <ul className="space-y-2">
              {feederAlerts.slice(0, 12).map((a) => (
                <AlertRow key={a.id} alert={a} />
              ))}
            </ul>
            {feederAlerts.length > 12 && (
              <p
                className="text-[11px] mt-3 italic"
                style={{ color: "rgb(var(--fg-faint))" }}
              >
                ({feederAlerts.length - 12} more)
              </p>
            )}
          </section>
        )}

        {loading && Object.keys(forecasts).length === 0 && (
          <div
            className="text-center text-sm py-4 flex items-center justify-center gap-2"
            style={{ color: "rgb(var(--fg-subtle))" }}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Pulling latest forecast…
          </div>
        )}

        <p
          className="text-[10px] text-center pt-2"
          style={{ color: "rgb(var(--fg-faint))" }}
        >
          Data: Open-Meteo · NWS · RainViewer · OpenStreetMap. Refresh by
          reopening the tab.
        </p>
      </div>
    </div>
  );
}

function HubCard({
  hub,
  forecast,
}: {
  hub: { code: string; label: string };
  forecast: WeatherForecast | null;
}) {
  if (!forecast) {
    return (
      <div
        className="card p-4 h-32 flex items-center justify-center"
        style={{ color: "rgb(var(--fg-faint))" }}
      >
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading {hub.label}…
      </div>
    );
  }
  const c = forecast.current;
  const wi = weatherInfo(c.weatherCode, c.isDay);
  return (
    <div className="card-strong p-4 relative overflow-hidden">
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30 pointer-events-none"
        style={{
          background: c.isDay
            ? "radial-gradient(closest-side, rgba(245,158,11,0.55), transparent 70%)"
            : "radial-gradient(closest-side, rgba(96,165,250,0.5), transparent 70%)",
          filter: "blur(36px)",
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-[10px] uppercase tracking-[0.3em] font-bold"
            style={{ color: "rgb(var(--fg-faint))" }}
          >
            {hub.label}
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <div
              className="font-extrabold tabular tracking-tight"
              style={{ fontSize: "44px", color: "rgb(var(--fg))", lineHeight: 1 }}
            >
              {Math.round(c.tempF)}°
            </div>
            <div className="text-2xl">{wi.emoji}</div>
          </div>
          <div
            className="text-[12px] mt-1"
            style={{ color: "rgb(var(--fg-subtle))" }}
          >
            {wi.label} · feels {Math.round(c.feelsLikeF)}°
          </div>
        </div>
        <div className="text-right text-[11px] tabular shrink-0 space-y-0.5">
          <Stat icon={Wind} value={`${Math.round(c.windMph)} mph`} />
          <Stat icon={Droplets} value={`${c.humidity}%`} />
          {c.precipIn > 0 && (
            <Stat icon={CloudRain} value={`${c.precipIn}″`} />
          )}
        </div>
      </div>

      {/* Hourly mini-strip */}
      <div className="relative mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {forecast.hourly.slice(0, 12).map((h) => {
          const hwi = weatherInfo(h.weatherCode, true);
          return (
            <div
              key={h.time}
              className="flex flex-col items-center px-2 py-1.5 rounded-lg shrink-0"
              style={{
                background: "rgb(var(--bg-raised) / 0.3)",
                border: "1px solid rgb(var(--border) / 0.06)",
              }}
            >
              <div
                className="text-[10px] tabular"
                style={{ color: "rgb(var(--fg-faint))" }}
              >
                {new Date(h.time).toLocaleTimeString("en-US", {
                  hour: "numeric",
                })}
              </div>
              <div className="text-base">{hwi.emoji}</div>
              <div
                className="text-[12px] font-semibold tabular"
                style={{ color: "rgb(var(--fg))" }}
              >
                {Math.round(h.tempF)}°
              </div>
              <div
                className="text-[9px] tabular"
                style={{ color: "rgb(96 165 250)" }}
              >
                {h.precipChance}%
              </div>
            </div>
          );
        })}
      </div>

      {/* 5-day strip */}
      <div className="relative mt-2 grid grid-cols-5 gap-1">
        {forecast.daily.slice(0, 5).map((d) => {
          const dwi = weatherInfo(d.weatherCode, true);
          const date = new Date(d.date + "T12:00:00");
          return (
            <div
              key={d.date}
              className="flex flex-col items-center px-1 py-1.5 rounded-lg"
              style={{
                background: "rgb(var(--bg-raised) / 0.2)",
                border: "1px solid rgb(var(--border) / 0.04)",
              }}
            >
              <div
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "rgb(var(--fg-faint))" }}
              >
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div className="text-sm">{dwi.emoji}</div>
              <div className="text-[11px] tabular">
                <span className="font-semibold" style={{ color: "rgb(var(--fg))" }}>
                  {Math.round(d.highF)}°
                </span>{" "}
                <span style={{ color: "rgb(var(--fg-faint))" }}>
                  {Math.round(d.lowF)}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
}) {
  return (
    <div
      className="flex items-center justify-end gap-1"
      style={{ color: "rgb(var(--fg-subtle))" }}
    >
      <Icon className="w-3 h-3" />
      <span>{value}</span>
    </div>
  );
}

function AlertRow({ alert: a }: { alert: WeatherAlert }) {
  const [open, setOpen] = useState(false);
  const sev = a.severity;
  const tone =
    sev === "Extreme"
      ? "rose"
      : sev === "Severe"
        ? "orange"
        : sev === "Moderate"
          ? "amber"
          : "slate";
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    rose: {
      bg: "rgb(244 63 94 / 0.1)",
      border: "rgb(244 63 94 / 0.4)",
      text: "rgb(253 164 175)",
    },
    orange: {
      bg: "rgb(249 115 22 / 0.1)",
      border: "rgb(249 115 22 / 0.4)",
      text: "rgb(253 186 116)",
    },
    amber: {
      bg: "rgb(245 158 11 / 0.1)",
      border: "rgb(245 158 11 / 0.4)",
      text: "rgb(252 211 77)",
    },
    slate: {
      bg: "rgb(var(--bg-raised) / 0.3)",
      border: "rgb(var(--border) / 0.1)",
      text: "rgb(var(--fg))",
    },
  };
  const c = colors[tone];
  return (
    <li
      className="rounded-lg overflow-hidden"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left p-3"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
            style={{ background: c.border, color: c.text }}
          >
            {sev}
          </span>
          <span className="font-semibold" style={{ color: "rgb(var(--fg))" }}>
            {a.event}
          </span>
        </div>
        <div
          className="text-[12px] mt-1 truncate"
          style={{ color: "rgb(var(--fg-subtle))" }}
        >
          {a.areaDesc}
        </div>
      </button>
      {open && (
        <div
          className="px-3 pb-3 pt-1 text-[12px] whitespace-pre-wrap"
          style={{
            color: "rgb(var(--fg-muted))",
            borderTop: `1px solid ${c.border}`,
          }}
        >
          {a.description}
        </div>
      )}
    </li>
  );
}

export type { CurrentWeather };
