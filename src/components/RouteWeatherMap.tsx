import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Eye, EyeOff, Pause, Play } from "lucide-react";
import {
  RadarFrame,
  WeatherForecast,
  radarTileUrl,
  weatherInfo,
} from "../data/weather";

export type WeatherStop = {
  code: string;
  city: string;
  state: string | null;
  lat: number;
  lng: number;
  forecast: WeatherForecast | null;
};

type Props = {
  stops: WeatherStop[];
  radarFrames: RadarFrame[];
};

/**
 * Compact map showing every stop on a driver's route with its current
 * weather emoji + temperature inline, an animated radar overlay, and a
 * dashed amber polyline connecting the stops in driving order. Used on
 * the Account page underneath the per-stop forecast strip so a driver
 * can see precipitation moving across the whole trip at once.
 */
export function RouteWeatherMap({ stops, radarFrames }: Props) {
  const [showStops, setShowStops] = useState(true);
  const valid = stops.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng),
  );

  const center = useMemo<[number, number]>(() => {
    if (valid.length === 0) return [41.5, -83.7];
    const lat = valid.reduce((s, p) => s + p.lat, 0) / valid.length;
    const lng = valid.reduce((s, p) => s + p.lng, 0) / valid.length;
    return [lat, lng];
  }, [valid]);

  if (valid.length < 1) return null;

  const path: [number, number][] = valid.map((s) => [s.lat, s.lng]);

  return (
    <div className="relative h-[280px] sm:h-[340px] rounded-xl overflow-hidden border border-border-subtle">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RadarLayer
          frames={radarFrames}
          showStops={showStops}
          onToggleStops={() => setShowStops((v) => !v)}
        />
        <FitBounds points={path} />
        {showStops && valid.length >= 2 && (
          <Polyline
            positions={path}
            pathOptions={{
              color: "#f59e0b",
              weight: 3,
              opacity: 0.75,
              dashArray: "6 6",
            }}
          />
        )}
        {showStops &&
          valid.map((s, i) => (
            <Marker
              key={s.code}
              position={[s.lat, s.lng]}
              icon={stopIcon(s, i === 0, i === valid.length - 1)}
            >
              <Popup>
                <div className="text-xs leading-snug">
                  <div className="font-mono font-bold text-slate-900">
                    {s.code} · {s.city}
                    {s.state ? `, ${s.state}` : ""}
                  </div>
                  {s.forecast ? (
                    <div className="mt-1 text-slate-700">
                      {Math.round(s.forecast.current.tempF)}° ·{" "}
                      {weatherInfo(
                        s.forecast.current.weatherCode,
                        s.forecast.current.isDay,
                      ).label}
                    </div>
                  ) : (
                    <div className="text-slate-500 mt-1">Weather loading…</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}

// Auto-fit map to the polyline bounds whenever stops change.
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const prev = useRef<string>("");
  useEffect(() => {
    if (points.length === 0) return;
    const key = points.map((p) => p.join(",")).join("|");
    if (key === prev.current) return;
    prev.current = key;
    if (points.length === 1) {
      map.setView(points[0], 9);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
  }, [points, map]);
  return null;
}

function stopIcon(_stop: WeatherStop, isFirst: boolean, isLast: boolean): L.DivIcon {
  // Small dot marker so the radar underneath reads through. Full stop
  // details (city, weather, temp) live in the cards above the map and in
  // the popup that opens on tap.
  const isEnd = isFirst || isLast;
  const size = isEnd ? 14 : 10;
  const fill = isEnd ? "#fbbf24" : "#f59e0b";
  const ring = isEnd ? "#fde68a" : "#fcd34d";
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 9999px;
      background: ${fill};
      border: 2px solid ${ring};
      box-shadow: 0 0 0 2px rgba(0,0,0,0.55), 0 0 12px rgba(245,158,11,0.6);
    "></div>`,
  });
}

// Reuses the radar layer pattern from WeatherMap but inlined here so this
// component is self-contained.
function RadarLayer({
  frames,
  showStops,
  onToggleStops,
}: {
  frames: RadarFrame[];
  showStops: boolean;
  onToggleStops: () => void;
}) {
  const [idx, setIdx] = useState(Math.max(0, frames.length - 1));
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (frames.length === 0) return;
    setIdx(Math.max(0, frames.length - 1));
  }, [frames.length]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    timerRef.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % frames.length);
    }, 700);
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current);
    };
  }, [playing, frames.length]);

  if (frames.length === 0) return null;
  const safeIdx = Math.min(Math.max(0, idx), frames.length - 1);
  const frame = frames[safeIdx];
  if (!frame) return null;
  const isFuture = Math.floor(Date.now() / 1000) - frame.time < -60;

  return (
    <>
      <TileLayer
        key={frame.path}
        url={radarTileUrl(frame, 2)}
        opacity={0.5}
        attribution="Radar &copy; <a href='https://rainviewer.com'>RainViewer</a>"
      />
      <div
        className="leaflet-bottom leaflet-left"
        style={{ pointerEvents: "auto", margin: 8 }}
      >
        <div
          className="leaflet-control flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: "rgb(10 11 20 / 0.7)",
            backdropFilter: "blur(12px)",
            color: "white",
            fontSize: 11,
            border: "1px solid rgb(255 255 255 / 0.1)",
          }}
        >
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            className="hover:text-amber-300"
            aria-label={playing ? "Pause radar" : "Play radar"}
          >
            {playing ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </button>
          <span className="tabular text-[10px]">
            {new Date(frame.time * 1000).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
            {isFuture && (
              <span className="ml-1 text-amber-300 font-bold">forecast</span>
            )}
          </span>
          <span
            aria-hidden
            style={{
              width: 1,
              height: 10,
              background: "rgb(255 255 255 / 0.15)",
            }}
          />
          <button
            type="button"
            onClick={onToggleStops}
            className="hover:text-amber-300"
            aria-label={showStops ? "Hide stop markers" : "Show stop markers"}
            title={showStops ? "Hide stops" : "Show stops"}
          >
            {showStops ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
