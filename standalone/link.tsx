import { createElement, type ReactNode } from "react";
/** next/link replacement for the single-file build: "/grow" becomes "#/grow" (a file has no server routes). */
export default function Link({ href, children, ...rest }: { href: string; children?: ReactNode; [k: string]: unknown }) {
  const h = href.startsWith("/") ? `#${href}` : href;
  return createElement("a", { href: h, ...rest }, children);
}
