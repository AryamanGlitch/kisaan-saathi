"use client";

import { useId, useState, type FormEvent } from "react";
import { useLanguage } from "./LanguageProvider";
import { useLocation } from "./LocationProvider";
import { Button, Notice } from "./ui";
import type { StringKey } from "@/lib/i18n/strings";
import type { PlaceCandidate, SavedLocation, SearchResponse } from "@/lib/location/types";
import { INDIA_STATES, findState } from "@/lib/location/states";
import { buildLabel, cleanText, isValidPin, isWithinIndiaBounds, roundCoord } from "@/lib/location/validate";
import { districtsFor, matchDistrict } from "@/lib/location/districtMatch";
import { getApi, type ClientErrorCode } from "@/lib/client/api";
import { errorKey } from "@/lib/client/errors";
import { geoPermission, getPosition, type GeoFailure } from "@/lib/client/geo";

interface Gps { lat: number; lon: number; accuracyM: number }
interface FormValues { state: string; district: string; place: string; pin: string }

type Step =
  | { name: "intro" }
  | { name: "locating"; retry: boolean }
  | { name: "confirm"; gps: Gps; cand: PlaceCandidate }
  | { name: "form"; message?: StringKey; gps?: Gps; values: FormValues }
  | { name: "searching"; values: FormValues }
  | { name: "pick"; values: FormValues; result: SearchResponse }
  | { name: "search-error"; values: FormValues; code: ClientErrorCode };

const EMPTY: FormValues = { state: "", district: "", place: "", pin: "" };
const ROUGH_ACCURACY_M = 5000;
const MAX_LEN = 60;
const OTHER = "__other";

export function LocationSetup({ onSaved }: { onSaved?: () => void }) {
  const { t } = useLanguage();
  const { saveLocation } = useLocation();
  const [step, setStep] = useState<Step>({ name: "intro" });
  const [picked, setPicked] = useState(0);

  function finish(loc: SavedLocation) {
    saveLocation(loc);
    onSaved?.();
  }

  const FAILURE_MESSAGE: Record<GeoFailure, StringKey> = {
    denied: "location.gpsDenied",
    unavailable: "location.gpsUnavailable",
    timeout: "location.gpsTimeout",
    insecure: "location.needHttps",
    embedded: "location.inPreview",
    unsupported: "location.gpsUnsupported",
  };

  async function startGps() {
    // If the browser has already blocked this site, asking again shows nothing: explain how to unblock instead.
    if ((await geoPermission()) === "denied") {
      setStep({ name: "form", message: "location.gpsDenied", values: EMPTY });
      return;
    }
    setStep({ name: "locating", retry: false });
    const pos = await getPosition(() => setStep({ name: "locating", retry: true }));
    if (!pos.ok) {
      setStep({ name: "form", message: FAILURE_MESSAGE[pos.reason], values: EMPTY });
      return;
    }
    // Round before anything leaves the phone (~100 m is enough for weather and area lookup).
    const gps = { lat: roundCoord(pos.lat), lon: roundCoord(pos.lon), accuracyM: pos.accuracyM };
    if (!isWithinIndiaBounds(gps.lat, gps.lon)) {
      setStep({ name: "form", message: "location.gpsOutside", values: EMPTY });
      return;
    }
    const r = await getApi<PlaceCandidate>(`/api/location/reverse?lat=${gps.lat}&lon=${gps.lon}`);
    if (r.ok) setStep({ name: "confirm", gps, cand: r.data });
    else if (r.code === "OUTSIDE_INDIA") setStep({ name: "form", message: "location.gpsOutside", values: EMPTY });
    else setStep({ name: "form", message: "location.reverseFailed", gps, values: EMPTY }); // keep the position, ask for names
  }

  /** The official district for a map result: tries district, tehsil and city names against the list. */
  function districtOf(cand: PlaceCandidate): string | null {
    return matchDistrict(cand.state, [cand.district, ...(cand.districtCandidates ?? [])]);
  }

  function saveFromGps(gps: Gps, cand: PlaceCandidate) {
    const state = findState(cand.state);
    const district = districtOf(cand) ?? cleanText(cand.district, 80);
    if (!state || !district) {
      // Map didn't give us usable names: keep the position, let the farmer fill the names.
      setStep({ name: "form", message: "location.reverseFailed", gps, values: { ...EMPTY, state: state?.en ?? "", district: district ?? "" } });
      return;
    }
    const place = cleanText(cand.place, 80);
    finish({
      version: 1, state: state.en, district, place,
      pin: cand.postcode && isValidPin(cand.postcode) ? cand.postcode : null,
      lat: gps.lat, lon: gps.lon, accuracyM: gps.accuracyM,
      label: buildLabel([place, district, state.en]), source: "gps", savedAt: new Date().toISOString(),
    });
  }

  function fromForm(v: FormValues, coords: { lat: number; lon: number; accuracyM: number | null } | null, source: SavedLocation["source"]): SavedLocation {
    const place = cleanText(v.place, MAX_LEN);
    const district = cleanText(v.district, MAX_LEN) ?? "";
    return {
      version: 1, state: v.state, district, place, pin: v.pin.trim() ? v.pin.trim() : null,
      lat: coords?.lat ?? null, lon: coords?.lon ?? null, accuracyM: coords?.accuracyM ?? null,
      label: buildLabel([place, district, v.state]), source, savedAt: new Date().toISOString(),
    };
  }

  async function search(values: FormValues) {
    setStep({ name: "searching", values });
    const q = new URLSearchParams({ state: values.state, district: values.district.trim() });
    if (values.place.trim()) q.set("place", values.place.trim());
    const r = await getApi<SearchResponse>(`/api/location/search?${q.toString()}`);
    if (r.ok) {
      setPicked(0);
      setStep({ name: "pick", values, result: r.data });
    } else {
      setStep({ name: "search-error", values, code: r.code });
    }
  }

  // ---------- screens ----------

  if (step.name === "intro") {
    return (
      <section className="space-y-5">
        <h2 className="text-2xl font-extrabold">{t("location.introTitle")}</h2>
        <p className="text-lg">{t("location.whyBody")}</p>
        <p className="text-base">{t("location.privacyBody")}</p>
        <Button onClick={() => void startGps()}>{t("location.useGps")}</Button>
        <Button variant="secondary" onClick={() => setStep({ name: "form", values: EMPTY })}>{t("location.enterManually")}</Button>
      </section>
    );
  }

  if (step.name === "locating") return <Notice>{t(step.retry ? "location.locatingGps" : "location.locating")}</Notice>;
  if (step.name === "searching") return <Notice>{t("location.searching")}</Notice>;

  if (step.name === "confirm") {
    const acc = step.gps.accuracyM;
    return (
      <section className="space-y-5">
        <h2 className="text-2xl font-extrabold">{t("location.confirmTitle")}</h2>
        <p className="text-2xl font-bold">{step.cand.label}</p>
        {(() => {
          const d = districtOf(step.cand);
          return d ? <p className="text-xl font-bold text-leaf">{t("location.districtIs", { d })}</p>
            : step.cand.district ? <Notice tone="caution">{t("location.districtUnmatched", { d: step.cand.district })}</Notice> : null;
        })()}
        <p className="text-lg">{acc < 1000 ? t("location.accuracyM", { m: Math.max(5, Math.round(acc / 5) * 5) }) : t("location.accuracy", { km: Math.round(acc / 1000) })}</p>
        {step.gps.accuracyM > ROUGH_ACCURACY_M && <Notice tone="caution">{t("location.roughWarning")}</Notice>}
        <Button onClick={() => saveFromGps(step.gps, step.cand)}>{t("location.saveThis")}</Button>
        <Button
          variant="secondary"
          onClick={() => {
            const st = findState(step.cand.state);
            setStep({ name: "form", values: { ...EMPTY, state: st?.en ?? "", district: districtOf(step.cand) ?? step.cand.district ?? "", place: step.cand.place ?? "" } });
          }}
        >
          {t("location.notMine")}
        </Button>
      </section>
    );
  }

  if (step.name === "form") {
    const gps = step.gps;
    return (
      <LocationForm
        initial={step.values}
        message={step.message}
        submitLabel={gps ? t("form.saveWithGps") : t("form.find")}
        onSubmit={(v) => (gps ? finish(fromForm(v, gps, "gps")) : void search(v))}
        onUseGps={() => void startGps()}
      />
    );
  }

  if (step.name === "search-error") {
    return (
      <section className="space-y-5">
        <Notice tone="error">
          {t("location.searchFailed")} {t(errorKey(step.code))}
        </Notice>
        <Button onClick={() => void search(step.values)}>{t("common.tryAgain")}</Button>
        <SaveWithout onSave={() => finish(fromForm(step.values, null, "manual-unverified"))} />
        <Button variant="secondary" onClick={() => setStep({ name: "form", values: step.values })}>{t("common.back")}</Button>
      </section>
    );
  }

  // step.name === "pick"
  const { candidates, precision } = step.result;
  const chosen = candidates[picked];
  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-extrabold">{t("location.pickTitle")}</h2>
      {candidates.length === 0 ? (
        <Notice tone="caution">{t("location.noResults")}</Notice>
      ) : (
        <>
          {precision === "district" && step.values.place.trim() && <Notice tone="caution">{t("location.districtOnly")}</Notice>}
          <fieldset className="space-y-3">
            <legend className="sr-only">{t("location.pickTitle")}</legend>
            {candidates.map((c, i) => (
              <label key={`${c.lat},${c.lon},${i}`}
                className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border-2 p-4 ${i === picked ? "border-leaf bg-leaf-wash" : "border-ink bg-white/60"}`}>
                <input type="radio" name="place" className="mt-1 h-6 w-6 accent-leaf" checked={i === picked} onChange={() => setPicked(i)} />
                <span>
                  <span className="block text-lg font-bold">{c.label}</span>
                  {c.place === null && <span className="block text-base">{t("location.centreNote")}</span>}
                  {!c.matchesState && <span className="block text-base font-semibold text-caution">{t("location.differentState")}</span>}
                </span>
              </label>
            ))}
          </fieldset>
          <Button
            disabled={!chosen}
            onClick={() => chosen && finish(fromForm(step.values, { lat: roundCoord(chosen.lat), lon: roundCoord(chosen.lon), accuracyM: null }, "manual-geocoded"))}
          >
            {t("location.saveSelected")}
          </Button>
        </>
      )}
      <SaveWithout onSave={() => finish(fromForm(step.values, null, "manual-unverified"))} />
      <Button variant="secondary" onClick={() => setStep({ name: "form", values: step.values })}>{t("common.back")}</Button>
    </section>
  );
}

function SaveWithout({ onSave }: { onSave: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={onSave}>{t("location.saveWithout")}</Button>
      <p className="text-base">{t("location.saveWithoutNote")}</p>
    </div>
  );
}

function LocationForm(props: {
  initial: FormValues;
  message?: StringKey;
  submitLabel: string;
  onSubmit: (v: FormValues) => void;
  onUseGps: () => void;
}) {
  const { t, lang } = useLanguage();
  const id = useId();
  const [v, setV] = useState<FormValues>(props.initial);
  const list = districtsFor(v.state);
  // Pre-select a listed district (e.g. from GPS); anything else goes into "not listed".
  const initialListed = props.initial.district ? matchDistrict(props.initial.state, [props.initial.district]) : null;
  const [choice, setChoice] = useState<string>(initialListed ?? (props.initial.district ? OTHER : ""));
  const [otherText, setOtherText] = useState(initialListed ? "" : props.initial.district);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  function validate(): boolean {
    const e: Partial<Record<keyof FormValues, string>> = {};
    if (!findState(v.state)) e.state = t("form.errState");
    const districtValue = choice === OTHER ? otherText : choice;
    if (!districtValue.trim()) e.district = t("form.errDistrict");
    else if (!cleanText(districtValue, MAX_LEN)) e.district = t("form.errTooLong", { max: MAX_LEN });
    if (v.place.trim() && !cleanText(v.place, MAX_LEN)) e.place = t("form.errTooLong", { max: MAX_LEN });
    if (v.pin.trim() && !isValidPin(v.pin.trim())) e.pin = t("form.errPin");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev: FormEvent) {
    ev.preventDefault();
    if (validate()) props.onSubmit({ ...v, district: (choice === OTHER ? otherText : choice).trim() });
  }

  const input = "min-h-14 w-full rounded-lg border-2 border-ink bg-paper px-3 text-lg";
  const field = (name: keyof FormValues, label: StringKey, extra: Record<string, unknown> = {}) => (
    <div className="space-y-1">
      <label htmlFor={`${id}-${name}`} className="block text-lg font-bold">{t(label)}</label>
      <input id={`${id}-${name}`} className={input} value={v[name]} maxLength={name === "pin" ? 6 : MAX_LEN + 20}
        aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${id}-${name}-err` : undefined}
        onChange={(e) => setV({ ...v, [name]: e.target.value })} {...extra} />
      {errors[name] && <p id={`${id}-${name}-err`} className="text-base font-semibold text-alert">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <h2 className="text-2xl font-extrabold">{t("location.introTitle")}</h2>
      {props.message && <Notice tone="caution">{t(props.message)}</Notice>}
      <div className="space-y-1">
        <label htmlFor={`${id}-state`} className="block text-lg font-bold">{t("form.state")}</label>
        <select id={`${id}-state`} className={input} value={v.state}
          aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? `${id}-state-err` : undefined}
          onChange={(e) => { setV({ ...v, state: e.target.value, district: "" }); setChoice(""); setOtherText(""); }}>
          <option value="">{t("form.statePlaceholder")}</option>
          {INDIA_STATES.map((s) => (
            <option key={s.en} value={s.en}>{lang === "hi" ? s.hi : s.en}</option>
          ))}
        </select>
        {errors.state && <p id={`${id}-state-err`} className="text-base font-semibold text-alert">{errors.state}</p>}
      </div>
      <div className="space-y-1">
        <label htmlFor={`${id}-district`} className="block text-lg font-bold">{t("form.district")}</label>
        <select id={`${id}-district`} className={input} value={choice} disabled={!v.state}
          aria-invalid={Boolean(errors.district)} aria-describedby={errors.district ? `${id}-district-err` : !v.state ? `${id}-district-hint` : undefined}
          onChange={(e) => setChoice(e.target.value)}>
          <option value="">{t("form.districtPlaceholder")}</option>
          {list.map((d) => <option key={d} value={d}>{d}</option>)}
          <option value={OTHER}>{t("form.districtOther")}</option>
        </select>
        {!v.state && <p id={`${id}-district-hint`} className="text-base">{t("form.chooseStateFirst")}</p>}
        {choice === OTHER && (
          <div className="space-y-1 pt-2">
            <label htmlFor={`${id}-district-other`} className="block text-base font-bold">{t("form.districtOtherLabel")}</label>
            <input id={`${id}-district-other`} className={input} value={otherText} maxLength={MAX_LEN + 20} autoComplete="address-level2"
              onChange={(e) => setOtherText(e.target.value)} />
          </div>
        )}
        {errors.district && <p id={`${id}-district-err`} className="text-base font-semibold text-alert">{errors.district}</p>}
      </div>
      {field("place", "form.place", { autoComplete: "address-level3" })}
      {field("pin", "form.pin", { inputMode: "numeric", autoComplete: "postal-code", pattern: "[0-9]*" })}
      <button type="submit" className="inline-flex min-h-14 w-full items-center justify-center lift rounded-lg bg-leaf px-5 shadow-sm text-lg font-bold text-white hover:bg-leaf-dark">
        {props.submitLabel}
      </button>
      <Button variant="secondary" onClick={props.onUseGps}>{t("form.useGpsInstead")}</Button>
    </form>
  );
}
