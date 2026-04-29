// Free weather data sources (no API keys, no signup):
// - Open-Meteo (open-meteo.com): forecast at any lat/lng
// - RainViewer (rainviewer.com): animated precipitation radar tiles
// - National Weather Service (api.weather.gov): active alerts as GeoJSON

export type CurrentWeather = {
  tempF: number;
  feelsLikeF: number;
  weatherCode: number;
  windMph: number;
  windDir: number;
  precipIn: number;
  humidity: number;
  isDay: boolean;
  fetchedAt: number;
};

export type HourlyForecast = {
  time: string; // ISO
  tempF: number;
  precipChance: number; // 0-100
  precipIn: number;
  weatherCode: number;
};

export type DailyForecast = {
  date: string; // YYYY-MM-DD
  highF: number;
  lowF: number;
  precipChance: number;
  precipIn: number;
  weatherCode: number;
};

export type WeatherForecast = {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
};

export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<WeatherForecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}` +
    `&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m` +
    `&hourly=temperature_2m,precipitation_probability,precipitation,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=auto&forecast_days=5&past_days=0`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  const j = await res.json();

  const current: CurrentWeather = {
    tempF: round1(j.current.temperature_2m),
    feelsLikeF: round1(j.current.apparent_temperature),
    weatherCode: j.current.weather_code,
    windMph: round1(j.current.wind_speed_10m),
    windDir: j.current.wind_direction_10m,
    precipIn: round2(j.current.precipitation),
    humidity: j.current.relative_humidity_2m,
    isDay: j.current.is_day === 1,
    fetchedAt: Date.now(),
  };

  const hourly: HourlyForecast[] = [];
  const nowMs = Date.now();
  const hours: string[] = j.hourly.time;
  for (let i = 0; i < hours.length; i++) {
    const ts = new Date(hours[i]).getTime();
    if (ts < nowMs - 30 * 60_000) continue;
    if (hourly.length >= 24) break;
    hourly.push({
      time: hours[i],
      tempF: round1(j.hourly.temperature_2m[i]),
      precipChance: j.hourly.precipitation_probability?.[i] ?? 0,
      precipIn: round2(j.hourly.precipitation[i]),
      weatherCode: j.hourly.weather_code[i],
    });
  }

  const daily: DailyForecast[] = j.daily.time.map(
    (date: string, i: number) => ({
      date,
      highF: round1(j.daily.temperature_2m_max[i]),
      lowF: round1(j.daily.temperature_2m_min[i]),
      precipChance: j.daily.precipitation_probability_max?.[i] ?? 0,
      precipIn: round2(j.daily.precipitation_sum[i]),
      weatherCode: j.daily.weather_code[i],
    }),
  );

  return { current, hourly, daily };
}

// ─── RainViewer animated radar tiles ─────────────────────────────────

export type RadarFrame = {
  /** Unix timestamp of this frame */
  time: number;
  /** Path segment to use in the tile URL */
  path: string;
};

export async function fetchRadarFrames(): Promise<RadarFrame[]> {
  const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
  if (!res.ok) throw new Error(`Radar fetch failed: ${res.status}`);
  const j = await res.json();
  // Use past frames + nowcast (forecast). Latest frame = `now`.
  const past: RadarFrame[] = (j.radar?.past ?? []).map(
    (f: { time: number; path: string }) => ({ time: f.time, path: f.path }),
  );
  const nowcast: RadarFrame[] = (j.radar?.nowcast ?? []).map(
    (f: { time: number; path: string }) => ({ time: f.time, path: f.path }),
  );
  return [...past, ...nowcast];
}

export function radarTileUrl(
  frame: RadarFrame,
  /** Color scheme: 2 = blue→red rain. */
  scheme: number = 2,
): string {
  // RainViewer wants {z}/{x}/{y} placeholders Leaflet replaces.
  return `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/${scheme}/1_1.png`;
}

// ─── NWS active alerts ───────────────────────────────────────────────

export type WeatherAlert = {
  id: string;
  event: string; // e.g. 'Winter Storm Warning'
  severity: string;
  headline: string;
  description: string;
  effective: string;
  expires: string;
  areaDesc: string;
  geometry?: GeoJSON.Geometry;
};

export async function fetchAlerts(
  states: string[],
): Promise<WeatherAlert[]> {
  if (states.length === 0) return [];
  const url = `https://api.weather.gov/alerts/active?area=${states.join(",")}`;
  const res = await fetch(url, {
    headers: { Accept: "application/geo+json" },
  });
  if (!res.ok) {
    console.error("NWS alerts fetch failed", res.status);
    return [];
  }
  const j = await res.json();
  return (j.features ?? []).map(
    (f: {
      id: string;
      geometry?: GeoJSON.Geometry;
      properties: {
        event: string;
        severity: string;
        headline: string;
        description: string;
        effective: string;
        expires: string;
        areaDesc: string;
      };
    }) => ({
      id: f.id,
      event: f.properties.event,
      severity: f.properties.severity,
      headline: f.properties.headline,
      description: f.properties.description,
      effective: f.properties.effective,
      expires: f.properties.expires,
      areaDesc: f.properties.areaDesc,
      geometry: f.geometry,
    }),
  );
}

// ─── Weather code helpers ────────────────────────────────────────────

/**
 * Open-Meteo / WMO weather codes → emoji + label.
 * https://open-meteo.com/en/docs (search "weather_code").
 */
export function weatherInfo(code: number, isDay = true): {
  emoji: string;
  label: string;
} {
  if (code === 0) return { emoji: isDay ? "☀️" : "🌙", label: "Clear" };
  if (code === 1) return { emoji: isDay ? "🌤️" : "🌙", label: "Mainly clear" };
  if (code === 2) return { emoji: "⛅", label: "Partly cloudy" };
  if (code === 3) return { emoji: "☁️", label: "Overcast" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Fog" };
  if (code === 51 || code === 53 || code === 55) return { emoji: "🌦️", label: "Drizzle" };
  if (code === 56 || code === 57) return { emoji: "🌧️", label: "Freezing drizzle" };
  if (code === 61 || code === 63 || code === 65) return { emoji: "🌧️", label: "Rain" };
  if (code === 66 || code === 67) return { emoji: "🌧️", label: "Freezing rain" };
  if (code === 71 || code === 73 || code === 75) return { emoji: "🌨️", label: "Snow" };
  if (code === 77) return { emoji: "🌨️", label: "Snow grains" };
  if (code === 80 || code === 81 || code === 82) return { emoji: "🌧️", label: "Rain showers" };
  if (code === 85 || code === 86) return { emoji: "🌨️", label: "Snow showers" };
  if (code === 95) return { emoji: "⛈️", label: "Thunderstorm" };
  if (code === 96 || code === 99) return { emoji: "⛈️", label: "Thunderstorm w/ hail" };
  return { emoji: "❓", label: "Unknown" };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
