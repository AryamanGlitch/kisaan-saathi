import { useEffect, useState } from "react";

/** next/navigation replacement for the single-file build: pages are "#/grow"-style hash addresses. */
const current = () => (window.location.hash.replace(/^#/, "") || "/").split("?")[0] || "/";

export function usePathname(): string {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const on = () => setPath(current());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return path;
}

export function useRouter() {
  return {
    back: () => window.history.back(),
    push: (href: string) => { window.location.hash = href; },
  };
}
