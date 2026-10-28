"use client";

import { useLanguage } from "./LanguageProvider";
import { useLocation } from "./LocationProvider";
import { displayed, useWeather } from "./useWeather";
import { advisoryText } from "./advisoryText";
import { Button, LinkButton, Notice } from "./ui";
import { deriveAdvisories } from "@/lib/weather/advisories";
import { weatherCodeKey } from "@/lib/weather/codes";
import { dayKind, isStale, todayInIndia, WEATHER_STALE_AFTER_MS } from "@/lib/time";
import { formatTime, formatWeekday, round } from "@/lib/client/format";
import { errorKey } from "@/lib/client/errors";

export const IMD_URL = "https://mausam.imd.gov.in/";

export function WeatherView() {
  const { t, lang } = useLanguage();
  const { location, ready } = useLocation();
  const { state, refresh, refreshedAt } = useWeather(location, ready);

  if (state.status === "waiting") return <Notice>{t("common.loading")}</Notice>;
  if (state.status === "no-location") {
    return (
      <div className="space-y-4">
        <Notice>{t("weather.noLocation")}</Notice>
        <LinkButton href="/my-farm">{t("nav.setLocation")}</LinkButton>
      </div>
    );
  }
  if (state.status === "no-coords") {
    return (
      <div className="space-y-4">
        <Notice tone="caution">{t("home.noCoords")}</Notice>
        <LinkButton href="/my-farm">{t("myFarm.change")}</LinkButton>
      </div>
    );
  }

  const shown = displayed(state);
  const today = todayInIndia(new Date());

  return (
    <div className="space-y-8">
      {location && <p className="text-xl font-semibold">{t("weather.for", { place: location.label })}</p>}

      {state.status === "loading" && <Notice>{t("weather.loading")}</Notice>}
      {refreshedAt && state.status === "ready" && <Notice>{t("weather.refreshed", { time: formatTime(refreshedAt, lang) })}</Notice>}
      {state.status === "error" && (
        <Notice tone={shown ? "caution" : "error"}>
          {shown ? t("weather.savedCopy") : t(errorKey(state.code))}
        </Notice>
      )}

      {shown && (() => {
        const { payload } = shown;
        const { report } = payload;
        const stale = payload.stale || isStale(payload.fetchedAt, Date.now(), WEATHER_STALE_AFTER_MS);
        const advisories = deriveAdvisories(report);
        const c = report.current;
        return (
          <>
            {stale && <Notice tone="caution">{t("weather.stale")}</Notice>}

            <section aria-labelledby="now-title" className="glass-card space-y-2">
              <h2 id="now-title" className="text-2xl font-extrabold">{t("weather.now")}</h2>
              <p className="text-6xl font-extrabold leading-none">{round(c.temperatureC)}°C</p>
              <p className="text-2xl font-bold">{t(weatherCodeKey(c.weatherCode))}</p>
              <ul className="space-y-1 text-lg">
                {c.feelsLikeC !== null && <li>{t("weather.feelsLike", { v: round(c.feelsLikeC) })}</li>}
                {c.humidityPct !== null && <li>{t("weather.humidity", { v: round(c.humidityPct) })}</li>}
                {c.windKmh !== null && <li>{t("weather.wind", { v: round(c.windKmh) })}</li>}
                {c.precipitationMm !== null && c.precipitationMm > 0 && <li>{t("weather.rainNow", { v: c.precipitationMm })}</li>}
              </ul>
            </section>

            <section aria-labelledby="farm-title" className="space-y-3 glass-card">
              <h2 id="farm-title" className="text-2xl font-extrabold">{t("weather.farmTitle")}</h2>
              {advisories.length === 0 ? (
                <p className="text-xl font-semibold">{t("home.noConcerns")}</p>
              ) : (
                <ul className="space-y-3">
                  {advisories.map((a) => (
                    <li key={a.kind} className="border-l-4 border-leaf pl-3 text-xl font-semibold">{advisoryText(a, t, lang, today)}</li>
                  ))}
                </ul>
              )}
              <p className="text-base">{t("weather.farmNote")}</p>
              <a href={IMD_URL} target="_blank" rel="noopener noreferrer" className="inline-block min-h-12 py-2 text-lg font-bold text-leaf underline underline-offset-4">
                {t("weather.imdLink")}
              </a>
            </section>

            <section aria-labelledby="days-title" className="space-y-3 glass-card">
              <h2 id="days-title" className="text-2xl font-extrabold">{t("weather.forecastTitle")}</h2>
              <ul className="divide-y divide-rule">
                {report.daily.map((d) => {
                  const k = dayKind(d.date, today);
                  const label = k === "today" ? t("day.today") : k === "tomorrow" ? t("day.tomorrow") : formatWeekday(d.date, lang);
                  return (
                    <li key={d.date} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                      <span className="min-w-[8rem] text-lg font-extrabold">{label}</span>
                      <span className="flex-1 text-lg">{t(weatherCodeKey(d.weatherCode))}</span>
                      <span className="text-lg font-bold">{round(d.maxC)}° / {round(d.minC)}°</span>
                      <span className="w-full text-base">
                        {d.precipProbPct !== null && t("weather.rainChance", { v: round(d.precipProbPct) })}
                        {d.precipProbPct !== null && d.precipMm !== null && d.precipMm > 0 && ", "}
                        {d.precipMm !== null && d.precipMm > 0 && t("weather.rainAmount", { v: d.precipMm })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="space-y-1 glass-card text-base">
              <p className="font-semibold">{t("weather.source")}</p>
              <p>{t("weather.updated", { time: formatTime(payload.fetchedAt, lang) })}</p>
              <p>
                <a href={payload.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                  {payload.source.attribution}
                </a>
              </p>
            </section>
          </>
        );
      })()}

      <Button variant="secondary" onClick={refresh} disabled={state.status === "loading"}>
        {state.status === "error" && !shown ? t("common.tryAgain") : t("weather.refresh")}
      </Button>
    </div>
  );
}
