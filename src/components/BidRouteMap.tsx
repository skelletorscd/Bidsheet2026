import { useEffect, useMemo, useRef } from "react";
import L, { DivIcon } from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Bid } from "../types";
import { LocationEntry, mapsDirectionsUrl } from "../data/locations";
import { DIRECTORY_BY_CODE } from "../data/directory.generated";

type Props = {
  bid: Bid;
  locations: Record<string, LocationEntry>;
};

type PointedStop = {
  code: string;
  entry: LocationEntry | null;
  lat: number;
  lng: number;
};

export function BidRouteMap({ bid, locations }: Props) {
  const stops = useMemo<PointedStop[]>(() => {
    const out: PointedStop[] = [];
    // Unique codes in the order they appear in the bid's routes — keeps the
    // visual sequence of the drive.
    const seen = new Set<string>();
    for (const leg of bid.legs) {
      for (const tok of leg.routeTokens) {
        if (tok.kind !== "location") continue;
        if (seen.has(tok.code)) continue;
        seen.add(tok.code);
        const dir = DIRECTORY_BY_CODE[tok.code];
        const entry = locations[tok.code] ?? null;
        if (
          dir &&
          typeof dir.lat === "number" &&
          typeof dir.lng === "number"
        ) {
          out.push({ code: tok.code, entry, lat: dir.lat, lng: dir.lng });
        }
      }
    }
    return out;
  }, [bid, locations]);

  if (stops.length < 2) return null;

  const path: [number, number][] = stops.map((s) => [s.lat, s.lng]);
  const bounds = L.latLngBounds(path);

  return (
    <div className="mt-2 relative z-0 h-[260px] sm:h-[340px] rounded-xl overflow-hidden border border-border-subtle">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [30, 30] }}
        scrollWheelZoom={false}
        className="h-full w-full"
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToStops stops={stops} />
        <Polyline
          positions={path}
          pathOptions={{
            color: "#f59e0b",
            weight: 3,
            opacity: 0.85,
            dashArray: "6 6",
          }}
        />
        {stops.map((s, i) => (
          <Marker
            key={s.code}
            position={[s.lat, s.lng]}
            icon={makeIcon(s.code, i === 0, i === stops.length - 1)}
          >
            <Popup>
              <div className="text-xs leading-snug">
                <div className="font-mono font-bold text-slate-900">
                  {s.code}
                </div>
                <div className="font-semibold mt-0.5">
                  {s.entry?.name ?? "Unknown"}
                </div>
                {s.entry?.address && (
                  <div className="text-slate-600 mt-0.5">
                    {s.entry.address}
                  </div>
                )}
                {s.entry?.address && (
                  <a
                    href={mapsDirectionsUrl(s.entry.address, s.entry.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-1 text-sky-600 font-semibold"
                  >
                    ▸ Start GPS
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function FitToStops({ stops }: { stops: PointedStop[] }) {
  const map = useMap();
  const prevKey = useRef<string>("");
  useEffect(() => {
    const key = stops.map((s) => s.code).join(",");
    if (key === prevKey.current) return;
    prevKey.current = key;
    if (stops.length < 2) return;
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [stops, map]);
  return null;
}

function makeIcon(code: string, isFirst: boolean, isLast: boolean): DivIcon {
  const isEnd = isFirst || isLast;
  const bg = isEnd ? "#f59e0b" : "#0f141d";
  const border = isEnd ? "#fbbf24" : "#f59e0b";
  const textColor = isEnd ? "#0a0e16" : "#fcd34d";
  return L.divIcon({
    className: "",
    iconSize: [56, 24],
    iconAnchor: [28, 12],
    html: `<div style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 24px;
      padding: 0 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.05em;
      color: ${textColor};
      background: ${bg};
      border: 2px solid ${border};
      border-radius: 6px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.35);
      white-space: nowrap;
    ">${code}</div>`,
  });
}
