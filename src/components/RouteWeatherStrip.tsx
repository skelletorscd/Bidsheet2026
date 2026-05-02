import { lazy, Suspense, useEffect, useState } from "react";
import { AlertTriangle, CloudRain, Loader2, Map } from "lucide-react";
import {
  fetchAlerts,
  fetchRadarFrames,
  fetchWeather,
  RadarFrame,
  WeatherAlert,
  WeatherForecast,
  weatherInfo,
} from "../data/weather";
import { DIRECTORY, DirectoryRow } from "../data/directory.generated";
import { SnapshotBid } from "../data/roster";

// Lazy-load the map so the Leaflet bundle doesn't ship for users who never
// expand the route weather section.
const RouteWeatherMap = lazy(() =>
  import("./RouteWeatherMap").then((m) => ({ default: m.RouteWeatherMap })),
);

const BY_CODE: Record<string, DirectoryRow> = Object.fromEntries(
  DIRECTORY.map((r) => [r.code, r]),
);

const ALERT_STATES = ["OH", "MI", "PA", "IN", "IL", "KY", "WV", "NY"];

type StopForecast = {
  code: string;
  city: string;
  state: string | null;
  lat: number;
  lng: number;
  forecast: WeatherForecast | null;
};

/**
 * Compact horizontal strip showing the current weather + the next-few-hours
 * outlook for every stop on a bid's route. Mounts on the Account page next
 * to the user's assigned bid.
 */
export function RouteWeatherStrip({ bid }: { bid: SnapshotBid }) {
  const [stops, setStops] = useState<StopForecast[] | null>(null);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build the unique stop list (in route order), keeping only the ones
  // that have geocoded coords so we can ask Open-Meteo for a forecast.
  const targets = (() => {
    const seen = new Set<string>();
    const out: StopForecast[] = [];
    for (const leg of bid.legs) {
      for (const tok of leg.routeTokens) {
        if (tok.kind !== "location") continue;
        if (seen.has(tok.code)) continue;
        seen.add(tok.code);
        const row = BY_CODE[tok.code];
        if (!row?.lat || !row?.lng) continue;
        out.push({
          code: tok.code,
          city: row.city,
          state: row.state,
          lat: row.lat,
          lng: row.lng,
          forecast: null,
        });
      }
    }
    return out.slice(0, 8); // hard cap so we don't spam the free API
  })();

  useEffect(() => {
    let active = true;
    if (targets.length === 0) {
      setStops([]);
      return;
    }
    (async () => {
      try {
        const results = await Promise.all(
          targets.map(async (t) => {
            try {
              const f = await fetchWeather(t.lat, t.lng);
              return { ...t, forecast: f };
            } catch {
              return t;
            }
          }),
        );
        const [al, fr] = await Promise.all([
          fetchAlerts(ALERT_STATES).catch(() => [] as WeatherAlert[]),
          fetchRadarFrames().catch(() => [] as RadarFrame[]),
        ]);
        if (!active) return;
        setStops(results);
        setAlerts(al);
        setRadarFrames(fr);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bid.jobNum, bid.hub]);

  // Filter alerts down to ones whose area-description mentions a state we
  // care about for THIS bid. Cheap heuristic: match state codes from stops.
  const relevantStates = new Set(
    targets.map((t) => t.state).filter(Boolean) as string[],
  );
  const relevantAlerts = alerts.filter((a) =>
    [...relevantStates].some((s) => a.areaDesc.includes(s)),
  );

  if (targets.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      <div
        className="text-[10px] uppercase tracking-[0.3em] font-bold flex items-center gap-1.5"
        style={{ color: "rgb(var(--fg-faint))" }}
      >
        <CloudRain className="w-3 h-3 text-amber-300" />
        Weather along your route today
        {!stops && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
      </div>

      {error && (
        <div className="text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
          {error}
        </div>
      )}

      {stops && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {stops.map((s) => (
            <StopWeatherCard key={s.code} stop={s} />
          ))}
        </div>
      )}

      {stops && stops.length >= 2 && (
        <>
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="btn text-[12px] mt-1"
          >
            <Map className="w-3.5 h-3.5" />
            {showMap
              ? "Hide route map"
              : "See radar across my whole route"}
          </button>
          {showMap && (
            <Suspense
              fallback={
                <div
                  className="rounded-xl h-[280px] flex items-center justify-center"
                  style={{
                    background: "rgb(var(--bg-raised) / 0.3)",
                    border: "1px solid rgb(var(--border) / 0.06)",
                  }}
                >
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                </div>
              }
            >
              <RouteWeatherMap
                stops={stops.map((s) => ({
                  code: s.code,
                  city: s.city,
                  state: s.state,
                  lat: s.lat,
                  lng: s.lng,
                  forecast: s.forecast,
                }))}
                radarFrames={radarFrames}
              />
            </Suspense>
          )}
        </>
      )}

      {relevantAlerts.length > 0 && (
        <ul className="space-y-1.5 mt-1">
          {relevantAlerts.slice(0, 3).map((a) => (
            <li
              key={a.id}
              className="rounded-lg p-2 flex items-start gap-2 text-[12px]"
              style={{
                background:
                  a.severity === "Extreme"
                    ? "rgb(244 63 94 / 0.1)"
                    : a.severity === "Severe"
                      ? "rgb(249 115 22 / 0.1)"
                      : "rgb(245 158 11 / 0.1)",
                border: `1px solid ${
                  a.severity === "Extreme"
                    ? "rgb(244 63 94 / 0.4)"
                    : a.severity === "Severe"
                      ? "rgb(249 115 22 / 0.4)"
                      : "rgb(245 158 11 / 0.4)"
                }`,
              }}
            >
              <AlertTriangle
                className="w-3.5 h-3.5 mt-0.5 shrink-0"
                style={{
                  color:
                    a.severity === "Extreme"
                      ? "rgb(253 164 175)"
                      : a.severity === "Severe"
                        ? "rgb(253 186 116)"
                        : "rgb(252 211 77)",
                }}
              />
              <div className="min-w-0">
                <div
                  className="font-semibold truncate"
                  style={{ color: "rgb(var(--fg))" }}
                >
                  {a.event}
                </div>
                <div
                  className="text-[11px] truncate"
                  style={{ color: "rgb(var(--fg-subtle))" }}
                >
                  {a.areaDesc}
                </div>
              </div>
            </li>
          ))}
          {relevantAlerts.length > 3 && (
            <li
              className="text-[11px] italic px-2"
              style={{ color: "rgb(var(--fg-faint))" }}
            >
              +{relevantAlerts.length - 3} more · see Weather tab for full
              list
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function StopWeatherCard({ stop }: { stop: StopForecast }) {
  const f = stop.forecast;
  if (!f) {
    return (
      <div
        className="rounded-xl p-2.5 shrink-0 w-32 flex flex-col items-center justify-center"
        style={{
          background: "rgb(var(--bg-raised) / 0.3)",
          border: "1px solid rgb(var(--border) / 0.06)",
          color: "rgb(var(--fg-faint))",
        }}
      >
        <div className="text-[10px] font-mono font-bold text-amber-300 mb-1">
          {stop.code}
        </div>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </div>
    );
  }
  const c = f.current;
  const wi = weatherInfo(c.weatherCode, c.isDay);
  // Look ahead at the next 6 hours for the worst precip chance.
  const nextSix = f.hourly.slice(0, 6);
  const peakPrecip = nextSix.reduce(
    (max, h) => Math.max(max, h.precipChance),
    0,
  );
  const willRain = peakPrecip >= 40;
  return (
    <div
      className="rounded-xl p-2.5 shrink-0 w-32 relative overflow-hidden"
      style={{
        background: c.isDay
          ? "linear-gradient(135deg, rgb(245 158 11 / 0.12), rgb(var(--bg-raised) / 0.3))"
          : "linear-gradient(135deg, rgb(56 189 248 / 0.12), rgb(var(--bg-raised) / 0.3))",
        border: willRain
          ? "1px solid rgb(56 189 248 / 0.5)"
          : "1px solid rgb(var(--border) / 0.08)",
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-mono font-bold text-amber-300">
          {stop.code}
        </span>
        <span className="text-base">{wi.emoji}</span>
      </div>
      <div
        className="font-extrabold tabular text-2xl mt-0.5"
        style={{ color: "rgb(var(--fg))", lineHeight: 1 }}
      >
        {Math.round(c.tempF)}°
      </div>
      <div
        className="text-[10px] truncate"
        style={{ color: "rgb(var(--fg-subtle))" }}
      >
        {stop.city}
        {stop.state ? `, ${stop.state}` : ""}
      </div>
      {willRain ? (
        <div className="text-[10px] font-semibold text-sky-300 mt-1 tabular">
          ☔ {peakPrecip}% next 6h
        </div>
      ) : peakPrecip > 0 ? (
        <div
          className="text-[10px] mt-1 tabular"
          style={{ color: "rgb(var(--fg-faint))" }}
        >
          {peakPrecip}% next 6h
        </div>
      ) : (
        <div
          className="text-[10px] mt-1 tabular"
          style={{ color: "rgb(var(--fg-faint))" }}
        >
          dry next 6h
        </div>
      )}
    </div>
  );
}
