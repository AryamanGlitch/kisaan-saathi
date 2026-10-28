/**
 * TEST FIXTURE ONLY — a synthetic response in Open-Meteo's documented shape.
 * These numbers are invented for tests and must never be shown to users.
 */
export function makeForecastJson(overrides: {
  max?: Array<number | null>;
  min?: Array<number | null>;
  psum?: Array<number | null>;
  pprob?: Array<number | null>;
  wind?: Array<number | null>;
  omitProb?: boolean;
} = {}) {
  const time = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"];
  const daily: Record<string, unknown> = {
    time,
    weather_code: [1, 2, 3, 61, 0, 0, 1],
    temperature_2m_max: overrides.max ?? [29, 30, 31, 28, 29, 30, 30],
    temperature_2m_min: overrides.min ?? [15, 16, 16, 17, 15, 14, 15],
    precipitation_sum: overrides.psum ?? [0, 0, 0, 2.1, 0, 0, 0],
    precipitation_probability_max: overrides.pprob ?? [5, 10, 20, 45, 10, 5, 5],
    wind_speed_10m_max: overrides.wind ?? [8, 9, 10, 12, 8, 7, 8],
  };
  if (overrides.omitProb) delete daily.precipitation_probability_max;
  return {
    latitude: 30.3,
    longitude: 78.0,
    elevation: 640,
    timezone: "Asia/Kolkata",
    current: {
      time: "2026-10-26T14:00",
      temperature_2m: 27.4,
      apparent_temperature: 28.1,
      relative_humidity_2m: 55,
      precipitation: 0,
      weather_code: 1,
      wind_speed_10m: 6.5,
      is_day: 1,
    },
    daily,
  };
}
