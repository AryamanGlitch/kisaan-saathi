import { isCropId, type CropId } from "../crops/catalog.ts";

export type WaterAccess = "irrigated" | "rainfed" | "unknown";

/** Optional farm details, stored on the device only. */
export interface FarmProfile {
  version: 1;
  water: WaterAccess;
  mainCrop: CropId | null;
}

export const EMPTY_PROFILE: FarmProfile = { version: 1, water: "unknown", mainCrop: null };

export function isFarmProfile(x: unknown): x is FarmProfile {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    r.version === 1 &&
    (r.water === "irrigated" || r.water === "rainfed" || r.water === "unknown") &&
    (r.mainCrop === null || isCropId(r.mainCrop))
  );
}
