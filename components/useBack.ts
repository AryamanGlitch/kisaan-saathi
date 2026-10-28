"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Back button behaviour: return to the previous screen of the app, like a phone's back button, or to Home
 * when there is no earlier app screen (e.g. a shared link opened straight to /weather), so it never leaves the app.
 * The screens visited in this tab are kept in sessionStorage so a reload doesn't lose them.
 */
const KEY = "ks:visited:v1";

function read(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(-50) : [];
  } catch {
    return [];
  }
}

function write(stack: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-50)));
  } catch {
    /* private mode: back falls back to Home */
  }
}

/** Records each screen visited. Called from the header, which is on every screen (Home included). */
export function useTrackVisits() {
  const path = usePathname() ?? "/";
  useEffect(() => {
    const stack = read();
    if (stack.at(-1) === path) return; // reload
    if (stack.at(-2) === path) stack.pop(); // went back
    else stack.push(path);
    write(stack);
  }, [path]);
}

export function useGoBack(): () => void {
  const router = useRouter();
  return () => {
    if (read().length > 1) router.back();
    else {
      write(["/"]);
      router.push("/");
    }
  };
}
