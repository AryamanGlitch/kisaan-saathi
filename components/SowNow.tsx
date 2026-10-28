"use client";

import { useLanguage } from "./LanguageProvider";
import { useLocation } from "./LocationProvider";
import { AreaCrops, CardLink } from "./AreaCrops";
import { useAreaCrops } from "./useAreaCrops";
import { CROPS, type CropId } from "@/lib/crops/catalog";
import { DISTRICT_CROP_DATA } from "@/lib/crops/data";
import { cropsSowableOn } from "@/lib/crops/engine";
import { todayInIndia } from "@/lib/time";

/** Dashboard block: crops whose official sowing window is open today in the farmer's district. */
export function SowNow() {
  const { t, lang } = useLanguage();
  const { location } = useLocation();
  const area = useAreaCrops(location?.state, location?.district);
  if (!location) return null;
  const open = cropsSowableOn(location.state, location.district, todayInIndia(new Date()), DISTRICT_CROP_DATA);
  if (open.length === 0) return <AreaCrops district={location.district} data={area} compact />;
  const byCrop = new Map<CropId, string[]>();
  for (const o of open) byCrop.set(o.cropId, [...(byCrop.get(o.cropId) ?? []), t(`regime.${o.window.regime}`)]);
  const hasArea = Boolean(area.verified || area.dataset);
  return (
    <div className={`grid gap-6 ${hasArea ? "md:grid-cols-2" : ""}`}>
      <section aria-labelledby="sow-now" className="glass-card flex flex-col justify-between gap-4">
        <h2 id="sow-now" className="text-xl font-extrabold leading-tight">{t("home.sowNow", { district: location.district })}</h2>
        <ul className="flex-1 space-y-1 text-lg text-muted">
          {[...byCrop].map(([c, regimes]) => (
            <li key={c}><span className="font-bold text-ink">{CROPS[c][lang]}</span>: {regimes.join(", ")}</li>
          ))}
        </ul>
        <CardLink href="/grow">{t("section.grow")}</CardLink>
      </section>
      <AreaCrops district={location.district} data={area} compact />
    </div>
  );
}
