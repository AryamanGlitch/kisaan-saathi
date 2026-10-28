import { useEffect, useId, useState, type FormEvent } from "react";
import { useLanguage } from "../components/LanguageProvider";
import { Button, Notice } from "../components/ui";
import { normalizeApiKey } from "../lib/assistant/apiKey";
import { errorKey } from "../lib/client/errors";
import { GEMINI_KEY_STORAGE, readGeminiKey, testGeminiKey, type ClientErrorCode } from "./localApi";

type Test = { state: "idle" } | { state: "testing" } | { state: "works"; model: string } | { state: "failed"; code: ClientErrorCode };

/** Lets the farmer (or a demo operator) enter their own Gemini key. Stored only in this browser, tested with Google on save. */
export function GeminiKey() {
  const { t } = useLanguage();
  const id = useId();
  const [key, setKey] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [test, setTest] = useState<Test>({ state: "idle" });

  useEffect(() => {
    // Keep every copy of this form in sync (same tab via custom event, other tabs via "storage").
    const sync = () => setKey(readGeminiKey());
    sync();
    window.addEventListener("ks-gemini-key", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ks-gemini-key", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  async function runTest(k: string) {
    setTest({ state: "testing" });
    const r = await testGeminiKey(k);
    setTest(r.ok ? { state: "works", model: r.model } : { state: "failed", code: r.code });
  }

  function save(e: FormEvent) {
    e.preventDefault();
    const r = normalizeApiKey(input);
    if (!r.ok) return setError(true);
    try {
      localStorage.setItem(GEMINI_KEY_STORAGE, JSON.stringify({ apiKey: r.key }));
    } catch {
      /* storage blocked: keep it for this visit only (the storage banner explains) */
    }
    setKey(r.key);
    window.dispatchEvent(new Event("ks-gemini-key"));
    setInput("");
    setError(false);
    void runTest(r.key);
  }

  function remove() {
    try {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    } catch {
      /* ignore */
    }
    setKey(null);
    setTest({ state: "idle" });
    window.dispatchEvent(new Event("ks-gemini-key"));
  }

  const old = key?.startsWith("AIza");
  return (
    <section aria-labelledby={`${id}-t`} className="space-y-3 glass-card">
      <h2 id={`${id}-t`} className="text-xl font-extrabold">{t("key.title")}</h2>
      {key ? (
        <>
          {test.state === "testing" && <Notice>{t("key.testing")}</Notice>}
          {test.state === "works" && <Notice>{t("key.works", { model: test.model })}</Notice>}
          {test.state === "failed" && (
            <Notice tone={test.code === "UNAUTHORIZED" || test.code === "NOT_CONFIGURED" ? "error" : "caution"}>
              {test.code === "UNAUTHORIZED" ? t("key.rejected") : test.code === "NOT_CONFIGURED" ? t("key.noModel") : t("key.untested", { reason: t(errorKey(test.code)) })}
            </Notice>
          )}
          {test.state === "idle" && <Notice>{t("key.saved", { last: key.slice(-4) })}</Notice>}
          {old && <Notice tone="caution">{t("key.oldFormat")}</Notice>}
          {test.state === "works" && <p className="text-lg font-bold">{t("key.retry")}</p>}
          <Button variant="secondary" onClick={() => void runTest(key)} disabled={test.state === "testing"}>{t("key.testAgain")}</Button>
          <Button variant="secondary" onClick={remove}>{t("key.remove")}</Button>
        </>
      ) : (
        <form onSubmit={save} className="space-y-3" noValidate>
          <p className="text-lg">{t("key.why")}</p>
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="inline-block min-h-12 py-2 text-lg font-bold text-leaf underline underline-offset-4">
            {t("key.get")}
          </a>
          <label htmlFor={`${id}-k`} className="block text-lg font-bold">{t("key.label")}</label>
          <input id={`${id}-k`} type="password" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            className="min-h-14 w-full rounded-lg border-2 border-ink bg-paper px-3 text-lg" aria-invalid={error}
            aria-describedby={error ? `${id}-err` : undefined} />
          {error && <p id={`${id}-err`} className="text-base font-semibold text-alert">{t("key.invalid")}</p>}
          <button type="submit" className="inline-flex min-h-14 w-full items-center justify-center lift rounded-lg bg-leaf px-5 shadow-sm text-lg font-bold text-white hover:bg-leaf-dark">
            {t("key.save")}
          </button>
          <p className="text-base">{t("key.privacy")}</p>
        </form>
      )}
    </section>
  );
}
