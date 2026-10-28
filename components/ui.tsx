import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { BackButton } from "./BackButton";

type Variant = "primary" | "secondary" | "danger";

const base =
  "lift inline-flex w-full min-h-14 items-center justify-center gap-2 rounded-xl px-5 text-lg font-bold " +
  "disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-leaf text-white shadow-sm hover:bg-leaf-dark",
  secondary: "border-2 border-ink bg-white/60 text-ink shadow-sm hover:bg-ink hover:text-white",
  danger: "bg-alert text-white shadow-sm hover:opacity-90",
};

export function Button({ variant = "primary", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}

/** `fit`: full width on phones, natural width on wider screens. */
export function LinkButton({ href, variant = "primary", fit = false, children }: { href: string; variant?: Variant; fit?: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${fit ? "sm:w-auto" : ""}`}>
      {children}
    </Link>
  );
}

type Tone = "info" | "error" | "caution";
const tones: Record<Tone, string> = {
  info: "border-rule bg-white/70",
  error: "border-alert bg-alert-wash text-alert",
  caution: "border-caution bg-caution-wash text-caution",
};

/** For loading, error, stale and empty states. `role=alert` only for errors so screen readers aren't spammed. */
export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border-2 p-4 text-lg font-semibold ${tones[tone]}`}>
      {children}
    </div>
  );
}

/** Every page except Home starts with this, so the Back button sits right above each title. */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <BackButton />
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight">{children}</h1>
    </div>
  );
}
