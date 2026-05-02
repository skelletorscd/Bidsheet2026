import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { Feature, GeoJsonObject } from "geojson";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Pause, Play } from "lucide-react";
import { RadarFrame, WeatherAlert, radarTileUrl } from "../data/weather";

type Props = {
  hubs: ReadonlyArray<{
    code: string;
    label: string;
    lat: number;
    lng: number;
  }>;
  radarFrames: RadarFrame[];
  alerts: WeatherAlert[];
};

export function WeatherMap({ hubs, radarFrames, alerts }: Props) {
  const center = useMemo<[number, number]>(() => {
    if (hubs.length === 0) return [41.5, -83.7];
    const avgLat =
      hubs.reduce((s, h) => s + h.lat, 0) / hubs.length;
    const avgLng =
      hubs.reduce((s, h) => s + h.lng, 0) / hubs.length;
    return [avgLat, avgLng];
  }, [hubs]);

  return (
    <div className="relative h-[360px] sm:h-[480px]">
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

        <RadarLayer frames={radarFrames} />

        {alerts.map((a) =>
          a.geometry ? (
            <GeoJSON
              key={a.id}
              data={
                {
                  type: "Feature",
                  geometry: a.geometry,
                  properties: {},
                } as Feature as GeoJsonObject
              }
              pathOptions={{
                color: severityColor(a.severity),
                weight: 2,
                fillColor: severityColor(a.severity),
                fillOpacity: 0.18,
              }}
            />
          ) : null,
        )}

        {hubs.map((h) => (
          <Marker
            key={h.code}
            position={[h.lat, h.lng]}
            icon={hubIcon(h.code)}
          />
        ))}
      </MapContainer>
    </div>
  );
}

function severityColor(severity: string): string {
  if (severity === "Extreme") return "#dc2626";
  if (severity === "Severe") return "#f97316";
  if (severity === "Moderate") return "#f59e0b";
  return "#94a3b8";
}

function hubIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [60, 28],
    iconAnchor: [30, 14],
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      height:28px;padding:0 10px;
      font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
      font-weight:800;font-size:11px;letter-spacing:0.06em;
      color:#0a0b14;background:#f59e0b;
      border:2px solid #fbbf24;border-radius:8px;
      box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.4);
    ">${label}</div>`,
  });
}

// ─── Radar layer with simple play/pause control ──────────────────────

function RadarLayer({ frames }: { frames: RadarFrame[] }) {
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
  // Guard against the brief render where state still holds an out-of-bounds
  // index (initial mount, or after frames shrinks).
  const safeIdx = Math.min(Math.max(0, idx), frames.length - 1);
  const frame = frames[safeIdx];
  if (!frame) return null;
  const isFuture =
    Math.floor(Date.now() / 1000) - frame.time < -60;

  return (
    <>
      <TileLayer
        key={frame.path}
        url={radarTileUrl(frame, 2)}
        opacity={0.55}
        // RainViewer asks for attribution on the map.
        attribution="Radar &copy; <a href='https://rainviewer.com'>RainViewer</a>"
      />
      <div
        className="leaflet-bottom leaflet-left"
        style={{ pointerEvents: "auto", margin: 12 }}
      >
        <div
          className="leaflet-control flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: "rgb(10 11 20 / 0.7)",
            backdropFilter: "blur(12px)",
            color: "white",
            fontSize: 12,
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
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>
          <span className="tabular text-[11px]">
            {new Date(frame.time * 1000).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
            {isFuture && (
              <span className="ml-1 text-amber-300 font-bold">forecast</span>
            )}
          </span>
        </div>
      </div>
    </>
  );
}
