/** localStorage can throw (private mode, quota, disabled). Never let that break the page — but do tell the user. */
let healthy = true;
const EVENT = "ks-storage-failed";

function markFailed() {
  if (!healthy) return;
  healthy = false;
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

/** False once any save has failed (or the probe fails): data will not survive closing the app. */
export function storageHealthy(): boolean {
  return healthy;
}

export function probeStorage(): boolean {
  try {
    window.localStorage.setItem("ks:probe", "1");
    window.localStorage.removeItem("ks:probe");
    return true;
  } catch {
    markFailed();
    return false;
  }
}

export function onStorageFailed(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

export function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    markFailed();
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
