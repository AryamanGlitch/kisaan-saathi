"use client";

import { useLanguage } from "./LanguageProvider";
import { useLocation } from "./LocationProvider";
import { displayed, useWeather } from "./useWeather";
import { advisoryText } from "./advisoryText";
import { Button, LinkButton, Notice } from "./ui";
import { IconCloud, IconRain, IconSun } from "./icons";
import { deriveAdvisories } from "@/lib/weather/advisories";
import { weatherCodeKey, type WeatherCodeKey } from "@/lib/weather/codes";
import { isStale, todayInIndia, WEATHER_STALE_AFTER_MS } from "@/lib/time";
import { round } from "@/lib/client/format";
import { errorKey } from "@/lib/client/errors";

const DRY: WeatherCodeKey[] = ["wx.clear", "wx.mainlyClear"];
const GREY: WeatherCodeKey[] = ["wx.partlyCloudy", "wx.overcast", "wx.fog", "wx.unknown"];

/** Symbol next to the temperature; the words beside it carry the meaning, this is decoration. */
function SkyIcon({ code }: { code: number | null }) {
  const k = weatherCodeKey(code);
  if (DRY.includes(k)) return <span className="icon-dot tone-amber"><IconSun size={20} strokeWidth={2.2} /></span>;
  if (GREY.includes(k)) return <span className="icon-dot tone-indigo"><IconCloud size={20} strokeWidth={2.2} /></span>;
  return <span className="icon-dot tone-blue"><IconRain size={20} strokeWidth={2.2} /></span>;
}

/** Dashboard hero: the single most important thing about the farm's weather, in one sentence. */
export function TodayOnFarm() {
  const { t, lang } = useLanguage();
  const { location, ready } = useLocation();
  const { state, refresh } = useWeather(location, ready);
  const shown = displayed(state);

  return (
    <section aria-labelledby="today-title" className="glass-card space-y-4">
      <h1 id="today-title" className="eyebrow">{t("home.todayTitle")}</h1>

      {state.status === "no-coords" && (
        <>
          <Notice tone="caution">{t("home.noCoords")}</Notice>
          <LinkButton href="/my-farm" variant="secondary">{t("myFarm.change")}</LinkButton>
        </>
      )}
      {(state.status === "waiting" || (state.status === "loading" && !shown)) && <Notice>{t("weather.loading")}</Notice>}
      {state.status === "error" && !shown && (
        <>
          <Notice tone="error">{t(errorKey(state.code))}</Notice>
          <Button variant="secondary" onClick={refresh}>{t("common.tryAgain")}</Button>
        </>
      )}

      {shown && (() => {
        const { payload } = shown;
        const today = todayInIndia(new Date());
        const advisories = deriveAdvisories(payload.report);
        const [first, ...rest] = advisories;
        const stale = payload.stale || isStale(payload.fetchedAt, Date.now(), WEATHER_STALE_AFTER_MS);
        const c = payload.report.current;
        return (
          <>
            <p className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              {first ? advisoryText(first, t, lang, today) : t("home.noConcerns")}
            </p>
            {rest.length > 0 && (
              <div className="space-y-1">
                <p className="text-lg font-bold">{t("home.moreAdvice")}</p>
                <ul className="space-y-2">
                  {rest.map((a) => (
                    <li key={a.kind} className="border-l-4 border-leaf pl-3 text-lg">{advisoryText(a, t, lang, today)}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="flex items-center gap-3 text-xl sm:text-2xl">
              <SkyIcon code={c.weatherCode} />
              <span><span className="font-extrabold">{round(c.temperatureC)}°C</span> <span className="text-muted">{t(weatherCodeKey(c.weatherCode))}</span></span>
            </p>
            {state.status === "loading" && <Notice>{t("weather.loading")}</Notice>}
            {state.status === "error" && <Notice tone="caution">{t("weather.savedCopy")}</Notice>}
            {stale && <Notice tone="caution">{t("weather.stale")}</Notice>}
            <p className="text-sm font-medium text-muted">{t("weather.farmNote")}</p>
            <LinkButton href="/weather" variant="secondary" fit>{t("home.seeWeather")}</LinkButton>
          </>
        );
      })()}
    </section>
  );
}
