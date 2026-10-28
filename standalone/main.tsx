import { useEffect, useState, type JSX } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "../components/Providers";
import { AppHeader } from "../components/AppHeader";
import { OfflineBanner } from "../components/OfflineBanner";
import { StorageWarning } from "../components/StorageWarning";
import { useLanguage } from "../components/LanguageProvider";
import HomePage from "../app/page";
import MyFarmPage from "../app/my-farm/page";
import WeatherPage from "../app/weather/page";
import GrowPage from "../app/grow/page";
import CropCarePage from "../app/crop-care/page";
import SchemesPage from "../app/schemes/page";
import UtilitiesPage from "../app/utilities/page";
import AskPage from "../app/ask/page";
import SoilPage from "../app/soil/page";
import CheckPage from "../app/check/page";
import NotFound from "../app/not-found";
import { GeminiKey } from "./GeminiKey";

const ROUTES: Record<string, () => JSX.Element> = {
  "/": HomePage, "/my-farm": MyFarmPage, "/weather": WeatherPage, "/grow": GrowPage,
  "/crop-care": CropCarePage, "/schemes": SchemesPage, "/utilities": UtilitiesPage, "/ask": AskPage, "/soil": SoilPage, "/check": CheckPage,
};

/** True inside an embedded preview (e.g. a chat app's file viewer), where location, network and links are often blocked. */
function inPreview(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin parent: definitely embedded
  }
}

const pathFromHash = () => (window.location.hash.replace(/^#/, "") || "/").split("?")[0] || "/";

function Shell() {
  const { t } = useLanguage();
  const [path, setPath] = useState(pathFromHash);
  useEffect(() => {
    const onChange = () => {
      setPath(pathFromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  useEffect(() => {
    document.title = `${t("app.name")} | Kisaan Saathi`;
  }, [t]);
  const Page = ROUTES[path] ?? NotFound;
  return (
    <div className="mx-auto max-w-4xl px-3 py-3 sm:px-6 sm:py-10">
      <div className="glass-panel rounded-3xl">
        {inPreview() && <div role="status" className="rounded-t-3xl bg-caution-wash px-4 py-3 text-lg font-bold text-caution">{t("preview.banner")}</div>}
        <AppHeader />
        <OfflineBanner />
        <StorageWarning />
        <main className="px-4 py-8 sm:px-10">
          <Page key={path} />
          {/* Developer-only: farmers never see a key screen. The public website is the server version, which keeps the key on the server. */}
          {path === "/check" && <div className="pt-8"><GeminiKey /></div>}
        </main>
        <footer className="mx-4 flex flex-col gap-1 border-t border-rule py-6 text-sm text-muted sm:mx-10 sm:flex-row sm:flex-wrap sm:justify-between">
          <p><a href="#/check" className="font-bold text-ink underline underline-offset-4">{t("check.link")}</a></p>
          <p>Weather and place search by Open-Meteo.com (CC BY 4.0)</p>
          <p>Area names: © OpenStreetMap contributors</p>
        </footer>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <Providers>
    <Shell />
  </Providers>,
);
