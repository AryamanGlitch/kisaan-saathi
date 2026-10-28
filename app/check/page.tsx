"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "@/components/LocationProvider";
import { Button, Notice, PageTitle } from "@/components/ui";
import { getApi, postApi } from "@/lib/client/api";
import { errorKey } from "@/lib/client/errors";
import { probeStorage } from "@/lib/client/storage";
import { getPosition, type GeoFailure } from "@/lib/client/geo";
import type { StringKey } from "@/lib/i18n/strings";
import type { WeatherPayload } from "@/lib/server/weatherService";
import type { SoilPayload } from "@/lib/server/soilService";
import type { SearchResponse } from "@/lib/location/types";
import type { AssistantResponse } from "@/lib/assistant/types";

type Status = "pass" | "warn" | "fail";
interface Result { id: string; title: StringKey; status: Status; detail: string }

const ICON: Record<Status, string> = { pass: "✓", warn: "!", fail: "✗" };
const TONE: Record<Status, string> = { pass: "border-leaf text-leaf", warn: "border-caution text-caution", fail: "border-alert text-alert" };

/** Live self-test on the farmer's own device. Runs only when asked, so it never spends Gemini quota by itself. */
export default function CheckPage() {
  const { t, lang } = useLanguage();
  const { location } = useLocation();
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  // Saved place if it has map coordinates; otherwise a fixed test point (Dehradun).
  const pt = location && location.lat !== null && location.lon !== null
    ? { lat: location.lat, lon: location.lon, label: location.label }
    : { lat: 30.317, lon: 78.032, label: "Dehradun (test point)" };

  async function run() {
    setRunning(true);
    setCopied(null);
    const out: Result[] = [];
    const push = (r: Result) => { out.push(r); setResults([...out]); };
    const why = (code: Parameters<typeof errorKey>[0]) => t("check.failedWith", { reason: t(errorKey(code)) });

    const proto = window.location.protocol;
    push({ id: "secure", title: "check.secure", status: proto === "https:" || window.location.hostname === "localhost" ? "pass" : proto === "file:" ? "warn" : "fail",
      detail: t(proto === "https:" || window.location.hostname === "localhost" ? "check.secure.ok" : proto === "file:" ? "check.secure.file" : "check.secure.no") });
    let embedded = false;
    try { embedded = window.self !== window.top; } catch { embedded = true; }
    push({ id: "preview", title: "check.preview", status: embedded ? "fail" : "pass", detail: t(embedded ? "check.preview.no" : "check.preview.ok") });
    const store = probeStorage();
    push({ id: "storage", title: "check.storage", status: store ? "pass" : "fail", detail: t(store ? "check.storage.ok" : "check.storage.no") });
    push({ id: "online", title: "check.online", status: navigator.onLine ? "pass" : "fail", detail: t(navigator.onLine ? "check.online.ok" : "check.online.no") });

    const w = await getApi<WeatherPayload>(`/api/weather?lat=${pt.lat}&lon=${pt.lon}&refresh=1`);
    push({ id: "weather", title: "check.weather", status: w.ok ? "pass" : "fail",
      detail: w.ok ? t("check.weather.ok", { temp: Math.round(w.data.report.current.temperatureC), place: pt.label }) : why(w.code) });
    const s = await getApi<SoilPayload>(`/api/soil?lat=${pt.lat}&lon=${pt.lon}`);
    push({ id: "soil", title: "check.soil", status: s.ok ? "pass" : "fail",
      detail: s.ok ? t("check.soil.ok", { v: s.data.soil.moisture3to9 === null ? "—" : Math.round(s.data.soil.moisture3to9 * 100) }) : why(s.code) });
    const g = await getApi<SearchResponse>("/api/location/search?state=Uttarakhand&district=Dehradun");
    push({ id: "search", title: "check.search", status: g.ok ? (g.data.candidates.length ? "pass" : "warn") : g.code === "NOT_CONFIGURED" ? "warn" : "fail",
      detail: g.ok ? (g.data.candidates[0] ? t("check.search.ok", { label: g.data.candidates[0].label }) : t("check.search.empty")) : why(g.code) });

    let perm: string = "unknown";
    try {
      const st = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
      if (st) perm = st.state;
    } catch { /* not supported */ }
    push({ id: "gps", title: "check.gpsPerm", status: perm === "granted" ? "pass" : perm === "denied" ? "fail" : "warn", detail: t(`check.gpsPerm.${perm}` as StringKey) });

    const a = await postApi<AssistantResponse>("/api/assistant", { lang, messages: [{ role: "user", text: "Connection test: reply with one short sentence about what you help farmers with." }], location: null, farm: null });
    push({ id: "assistant", title: "check.assistant", status: a.ok ? "pass" : a.code === "NOT_CONFIGURED" ? "warn" : "fail",
      detail: a.ok ? t("check.assistant.ok", { model: a.data.model ?? "—" })
        : a.code === "NOT_CONFIGURED" ? t("check.assistant.nokey")
        : a.code === "UNAUTHORIZED" ? t("check.assistant.badkey") : why(a.code) });
    setRunning(false);
  }

  async function testGps() {
    const msg: Record<GeoFailure, StringKey> = {
      denied: "location.gpsDenied", unavailable: "location.gpsUnavailable", timeout: "location.gpsTimeout",
      insecure: "location.needHttps", embedded: "location.inPreview", unsupported: "location.gpsUnsupported",
    };
    const show = (r: Result) => setResults((prev) => [...prev.filter((x) => x.id !== "gpsTest"), r]);
    show({ id: "gpsTest", title: "check.gpsTest", status: "warn", detail: t("location.locating") });
    const pos = await getPosition(() => show({ id: "gpsTest", title: "check.gpsTest", status: "warn", detail: t("location.locatingGps") }));
    show(pos.ok
      ? { id: "gpsTest", title: "check.gpsTest", status: "pass", detail: t("check.gpsTest.ok", { m: pos.accuracyM }) }
      : { id: "gpsTest", title: "check.gpsTest", status: "fail", detail: t("check.gpsTest.fail", { reason: t(msg[pos.reason]) }) });
  }

  async function copyReport() {
    const lines = [
      `Kisaan Saathi check — ${new Date().toISOString()}`,
      `Address: ${window.location.protocol}//${window.location.host || "(file)"} · Browser: ${navigator.userAgent}`,
      ...results.map((r) => `${ICON[r.status]} ${t(r.title)}: ${r.detail}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(t("util.copied"));
    } catch {
      setCopied(t("util.copyFailed"));
    }
  }

  const count = (s: Status) => results.filter((r) => r.status === s).length;
  return (
    <div className="space-y-6">
      <PageTitle>{t("check.title")}</PageTitle>
      <p className="text-lg">{t("check.intro")}</p>
      <Button onClick={() => void run()} disabled={running}>{running ? t("check.running") : t("check.run")}</Button>
      <Button variant="secondary" onClick={() => void testGps()}>{t("check.gps")}</Button>
      {results.length > 0 && (
        <>
          {!running && <Notice tone={count("fail") ? "error" : count("warn") ? "caution" : "info"}>{t("check.summary", { pass: count("pass"), warn: count("warn"), fail: count("fail") })}</Notice>}
          <ul className="space-y-3" aria-live="polite">
            {results.map((r) => (
              <li key={r.id} className="flex items-start gap-3">
                <span aria-hidden="true" className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 text-base font-extrabold ${TONE[r.status]}`}>{ICON[r.status]}</span>
                <span>
                  <span className="block text-lg font-bold">{t(r.title)}</span>
                  <span className="block text-base">{r.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={() => void copyReport()}>{t("check.copy")}</Button>
          {copied && <p role="status" className="text-base">{copied}</p>}
        </>
      )}
    </div>
  );
}
