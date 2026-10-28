import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppHeader } from "@/components/AppHeader";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { StorageWarning } from "@/components/StorageWarning";

// Self-hosted at build time by next/font: no request to Google from the farmer's phone. Latin only;
// Hindi text falls back to the system Devanagari font (see --font-sans in globals.css).
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: "किसान साथी | Kisaan Saathi",
  description: "Weather and farm help for Indian farmers, in Hindi and English.",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f6f4",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hi" className={jakarta.variable}>
      <body className="app-bg min-h-screen font-sans text-ink antialiased">
        <Providers>
          <ServiceWorkerRegister />
          <div className="mx-auto max-w-4xl px-3 py-3 sm:px-6 sm:py-10">
            <div className="glass-panel rounded-3xl">
              <AppHeader />
              <OfflineBanner />
              <StorageWarning />
              <main className="px-4 py-8 sm:px-10">{children}</main>
              <footer className="mx-4 flex flex-col gap-1 border-t border-rule py-6 text-sm text-muted sm:mx-10 sm:flex-row sm:flex-wrap sm:justify-between">
                <p><a href="/check" className="font-bold text-ink underline underline-offset-4">Check the app / ऐप की जाँच</a></p>
                <p>Map data © OpenStreetMap contributors</p>
                <p>Weather data by Open-Meteo.com (CC BY 4.0)</p>
              </footer>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
