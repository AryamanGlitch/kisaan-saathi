"use client";

import { useId, useState } from "react";
import { useFarm } from "@/components/FarmProvider";
import { useStorageHealthy } from "@/components/StorageWarning";
import { isCropId, type CropId } from "@/lib/crops/catalog";
import { CropSelect } from "@/components/CropSelect";
import { useAreaCrops } from "@/components/useAreaCrops";
import type { WaterAccess } from "@/lib/farm/profile";
import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "@/components/LocationProvider";
import { LocationSetup } from "@/components/LocationSetup";
import { Button, Notice, PageTitle } from "@/components/ui";
import { formatDate } from "@/lib/client/format";
import type { StringKey } from "@/lib/i18n/strings";
import type { LocationSource } from "@/lib/location/types";

const SOURCE_TEXT: Record<LocationSource, StringKey> = {
  gps: "myFarm.sourceGps",
  "manual-geocoded": "myFarm.sourceManual",
  "manual-district": "myFarm.sourceDistrict",
  "manual-unverified": "myFarm.sourceUnverified",
};

export default function MyFarmPage() {
  const { t, lang } = useLanguage();
  const { location, ready, clearLocation } = useLocation();
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const storageOk = useStorageHealthy();

  if (!ready) return <Notice>{t("common.loading")}</Notice>;

  return (
    <div className="space-y-8">
      <PageTitle>{t("section.myFarm")}</PageTitle>
      {justSaved && !editing && <Notice tone={storageOk ? "info" : "caution"}>{t(storageOk ? "location.saved" : "storage.sessionOnly")}</Notice>}

      {!location || editing ? (
        <div className="space-y-4">
          <LocationSetup
            onSaved={() => {
              setEditing(false);
              setJustSaved(true);
            }}
          />
          {editing && <Button variant="secondary" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>}
        </div>
      ) : (
        <section aria-labelledby="loc-title" className="space-y-4">
          <h2 id="loc-title" className="text-xl font-bold">{t("myFarm.current")}</h2>
          <p className="text-2xl font-extrabold">{location.label}</p>
          <ul className="space-y-1 text-lg">
            <li>{t(SOURCE_TEXT[location.source])}</li>
            {location.pin && <li>PIN {location.pin}</li>}
            <li>{t("myFarm.savedOn", { date: formatDate(location.savedAt, lang) })}</li>
          </ul>
          {location.source === "manual-unverified" && <Notice tone="caution">{t("home.noCoords")}</Notice>}
          <Button onClick={() => { setJustSaved(false); setEditing(true); }}>{t("myFarm.change")}</Button>
          {confirmRemove ? (
            <div className="space-y-3 rounded-xl border-2 border-alert bg-alert-wash p-4">
              <p className="text-lg font-bold">{t("myFarm.removeConfirm")}</p>
              <Button variant="danger" onClick={() => { clearLocation(); setConfirmRemove(false); setJustSaved(false); }}>
                {t("myFarm.remove")}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmRemove(false)}>{t("common.cancel")}</Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmRemove(true)}>{t("myFarm.remove")}</Button>
          )}
        </section>
      )}

      {location && !editing && <FarmDetails />}
    </div>
  );
}

function FarmDetails() {
  const { t } = useLanguage();
  const { profile, saveProfile } = useFarm();
  const { location } = useLocation();
  const area = useAreaCrops(location?.state, location?.district);
  const id = useId();
  const [water, setWater] = useState<WaterAccess>(profile.water);
  const [crop, setCrop] = useState<CropId | "">(profile.mainCrop ?? "");
  const [saved, setSaved] = useState(false);
  return (
    <section aria-labelledby={`${id}-t`} className="space-y-4 glass-card">
      <h2 id={`${id}-t`} className="text-2xl font-extrabold">{t("farm.title")}</h2>
      <fieldset className="space-y-2">
        <legend className="text-lg font-bold">{t("farm.water")}</legend>
        {(["irrigated", "rainfed", "unknown"] as const).map((w) => (
          <label key={w} className={`flex min-h-14 items-center gap-3 rounded-lg border-2 px-4 ${water === w ? "border-leaf bg-leaf-wash" : "border-ink bg-white/60"}`}>
            <input type="radio" name="farm-water" className="h-6 w-6 accent-leaf" checked={water === w} onChange={() => { setWater(w); setSaved(false); }} />
            <span className="text-lg">{t(`farm.water.${w}`)}</span>
          </label>
        ))}
      </fieldset>
      <div className="space-y-1">
        <label htmlFor={`${id}-crop`} className="block text-lg font-bold">{t("farm.mainCrop")}</label>
        <CropSelect id={`${id}-crop`} className="min-h-14 w-full rounded-lg border-2 border-ink bg-paper px-3 text-lg" value={crop}
          onChange={(c) => { setCrop(c); setSaved(false); }} areaCropIds={area.cropIds} areaName={area.cropArea} emptyLabel={t("farm.noCrop")} />
      </div>
      <p className="text-base">{t("farm.privacy")}</p>
      <Button onClick={() => { saveProfile({ version: 1, water, mainCrop: isCropId(crop) ? crop : null }); setSaved(true); }}>{t("farm.save")}</Button>
      {saved && <Notice>{t("farm.saved")}</Notice>}
    </section>
  );
}
