"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { CROPS, CROP_IDS, isCropId, type CropId } from "@/lib/crops/catalog";

/**
 * Crop menu that shows only the crops grown in the farmer's district (or, failing that, state) when known,
 * with "Other crop" to reveal the full list (so a missing minor crop never blocks anyone).
 */
export function CropSelect(props: {
  id: string;
  value: CropId | "";
  onChange: (v: CropId | "") => void;
  areaCropIds: CropId[];
  /** District or state that `areaCropIds` belongs to. */
  areaName: string | null;
  emptyLabel: string;
  className: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const { t, lang } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const area = props.areaCropIds;
  const filtered = area.length > 0 && !showAll && (props.value === "" || area.includes(props.value as CropId));
  const name = (c: CropId) => CROPS[c][lang];
  const sortByName = (ids: CropId[]) => [...ids].sort((a, b) => name(a).localeCompare(name(b), lang === "hi" ? "hi" : "en"));
  return (
    <select id={props.id} className={props.className} value={props.value} aria-invalid={props.invalid} aria-describedby={props.describedBy}
      onChange={(e) => {
        if (e.target.value === "__other") { setShowAll(true); props.onChange(""); return; }
        props.onChange(isCropId(e.target.value) ? e.target.value : "");
      }}>
      <option value="">{props.emptyLabel}</option>
      {filtered ? (
        <>
          <optgroup label={t("crop.areaGroup", { district: props.areaName ?? "" })}>
            {sortByName(area).map((c) => <option key={c} value={c}>{name(c)}</option>)}
          </optgroup>
          <option value="__other">{t("crop.other")}</option>
        </>
      ) : (
        <optgroup label={t("crop.allGroup")}>
          {sortByName(CROP_IDS).map((c) => <option key={c} value={c}>{name(c)}</option>)}
        </optgroup>
      )}
    </select>
  );
}
