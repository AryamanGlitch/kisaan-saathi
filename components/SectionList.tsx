"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useLanguage } from "./LanguageProvider";
import { IconBarn, IconBolt, IconChat, IconChevron, IconLandmark, IconLeaf, IconSprout, IconSoil, IconSun } from "./icons";
import type { StringKey } from "@/lib/i18n/strings";

interface Section {
  href: string;
  title: StringKey;
  desc: StringKey;
  Icon: ComponentType<{ size?: number; className?: string }>;
  ready: boolean; // false = honest "Coming soon" tag
  tone: string; // icon tile colour, see .tone-* in app/theme.css
}

export const SECTIONS: Section[] = [
  { href: "/my-farm", title: "section.myFarm", desc: "section.myFarm.desc", Icon: IconBarn, ready: true, tone: "tone-leaf" },
  { href: "/weather", title: "section.weather", desc: "section.weather.desc", Icon: IconSun, ready: true, tone: "tone-amber" },
  { href: "/grow", title: "section.grow", desc: "section.grow.desc", Icon: IconSprout, ready: true, tone: "tone-leaf" },
  { href: "/soil", title: "section.soil", desc: "section.soil.desc", Icon: IconSoil, ready: true, tone: "tone-earth" },
  { href: "/crop-care", title: "section.cropCare", desc: "section.cropCare.desc", Icon: IconLeaf, ready: true, tone: "tone-teal" },
  { href: "/schemes", title: "section.schemes", desc: "section.schemes.desc", Icon: IconLandmark, ready: true, tone: "tone-indigo" },
  { href: "/utilities", title: "section.utilities", desc: "section.utilities.desc", Icon: IconBolt, ready: true, tone: "tone-violet" },
  { href: "/ask", title: "section.ask", desc: "section.ask.desc", Icon: IconChat, ready: true, tone: "tone-blue" },
];

export function SectionList() {
  const { t } = useLanguage();
  return (
    <ul className="glass-list">
      {SECTIONS.map(({ href, title, desc, Icon, ready, tone }) => (
        <li key={href}>
          <Link href={href} className="group flex min-h-20 items-center gap-4 px-4 py-4 hover:bg-white/80 sm:px-5">
            <span className={`icon-tile ${tone}`}><Icon size={24} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold group-hover:text-leaf sm:text-xl">{t(title)}</span>
              <span className="block text-base font-medium text-muted">{t(desc)}</span>
              {!ready && (
                <span className="mt-1 inline-block rounded-full border border-ink px-2 text-sm font-bold">{t("status.comingSoon")}</span>
              )}
            </span>
            <IconChevron size={22} strokeWidth={2.5} className="nudge shrink-0 text-muted group-hover:text-leaf" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
