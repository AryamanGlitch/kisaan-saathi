/**
 * Open-Meteo forecast client: URL builder and strict response parser.
 * Docs: https://open-meteo.com/en/docs — free API is for non-commercial use (CC BY 4.0 attribution).
 */
export const OPEN_METEO_DEFAULT_BASE = "https://api.open-meteo.com/v1/forecast";

export const CURRENT_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "is_day",
] as const;

export const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
] as const;

export interface CurrentWeather {
  time: string; // local time, Asia/Kolkata, "YYYY-MM-DDTHH:mm"
  temperatureC: number;
  feelsLikeC: number | null;
  humidityPct: number | null;
  precipitationMm: number | null;
  windKmh: number | null;
  weatherCode: number | null;
  isDay: boolean | null;
}

export interface DailyWeather {
  date: string; // "YYYY-MM-DD"
  maxC: number | null;
  minC: number | null;
  precipMm: number | null;
  precipProbPct: number | null; // not every model provides it
  windMaxKmh: number | null;
  weatherCode: number | null;
}

export interface WeatherReport {
  lat: number;
  lon: number;
  elevationM: number | null;
  timezone: string;
  current: CurrentWeather;
  daily: DailyWeather[];
}

export class WeatherDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherDataError";
  }
}

export function buildForecastUrl(
  lat: number,
  lon: number,
  opts: { base?: string; apiKey?: string | null; days?: number } = {},
): string {
  const u = new URL(opts.base ?? OPEN_METEO_DEFAULT_BASE);
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set("current", CURRENT_VARS.join(","));
  u.searchParams.set("daily", DAILY_VARS.join(","));
  u.searchParams.set("timezone", "Asia/Kolkata");
  u.searchParams.set("forecast_days", String(opts.days ?? 7));
  // Units are the API defaults (°C, km/h, mm); set explicitly so a default change cannot silently break us.
  u.searchParams.set("temperature_unit", "celsius");
  u.searchParams.set("wind_speed_unit", "kmh");
  u.searchParams.set("precipitation_unit", "mm");
  if (opts.apiKey) u.searchParams.set("apikey", opts.apiKey);
  return u.toString();
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function requireNum(v: unknown, field: string): number {
  const n = numOrNull(v);
  if (n === null) throw new WeatherDataError(`Missing or invalid number: ${field}`);
  return n;
}

function column(daily: Rec, key: string, n: number): unknown[] {
  const col = daily[key];
  if (col === undefined) return new Array(n).fill(null); // field not returned by this model
  if (!Array.isArray(col) || col.length !== n) {
    throw new WeatherDataError(`daily.${key} has wrong length`);
  }
  return col;
}

/** Throws WeatherDataError for anything we cannot trust. Never fills gaps with invented values. */
export function parseForecast(json: unknown): WeatherReport {
  if (!isRec(json)) throw new WeatherDataError("Response is not an object");
  if (json.error === true) {
    throw new WeatherDataError(`Provider error: ${typeof json.reason === "string" ? json.reason : "unknown"}`);
  }
  const cur = json.current;
  const daily = json.daily;
  if (!isRec(cur)) throw new WeatherDataError("Missing current block");
  if (!isRec(daily)) throw new WeatherDataError("Missing daily block");
  if (typeof cur.time !== "string") throw new WeatherDataError("Missing current.time");

  const times = daily.time;
  if (!Array.isArray(times) || times.length === 0 || !times.every((t) => typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t))) {
    throw new WeatherDataError("daily.time is missing or malformed");
  }
  const n = times.length;
  const code = column(daily, "weather_code", n);
  const max = column(daily, "temperature_2m_max", n);
  const min = column(daily, "temperature_2m_min", n);
  const psum = column(daily, "precipitation_sum", n);
  const pprob = column(daily, "precipitation_probability_max", n);
  const wind = column(daily, "wind_speed_10m_max", n);

  const isDay = numOrNull(cur.is_day);
  return {
    lat: requireNum(json.latitude, "latitude"),
    lon: requireNum(json.longitude, "longitude"),
    elevationM: numOrNull(json.elevation),
    timezone: typeof json.timezone === "string" ? json.timezone : "Asia/Kolkata",
    current: {
      time: cur.time,
      temperatureC: requireNum(cur.temperature_2m, "current.temperature_2m"),
      feelsLikeC: numOrNull(cur.apparent_temperature),
      humidityPct: numOrNull(cur.relative_humidity_2m),
      precipitationMm: numOrNull(cur.precipitation),
      windKmh: numOrNull(cur.wind_speed_10m),
      weatherCode: numOrNull(cur.weather_code),
      isDay: isDay === null ? null : isDay === 1,
    },
    daily: (times as string[]).map((date, i) => ({
      date,
      maxC: numOrNull(max[i]),
      minC: numOrNull(min[i]),
      precipMm: numOrNull(psum[i]),
      precipProbPct: numOrNull(pprob[i]),
      windMaxKmh: numOrNull(wind[i]),
      weatherCode: numOrNull(code[i]),
    })),
  };
}
