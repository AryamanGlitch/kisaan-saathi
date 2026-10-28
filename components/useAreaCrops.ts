"use client";

import { useEffect, useState } from "react";
import { grownInDistrict, grownInState, type DistrictGrown } from "@/lib/crops/grown";
import { districtStats, loadStateCrops, stateCropIds } from "@/lib/client/cropDataset";
import type { CropStat } from "@/lib/crops/dataset";
import type { CropId } from "@/lib/crops/catalog";

export interface AreaCrops {
  verified: DistrictGrown | null;
  dataset: { source: string; crops: CropStat[] } | null;
  /** Catalog crops known to be grown in the district, or else in the state (for filtering crop menus). Empty = unknown. */
  cropIds: CropId[];
  /** The place `cropIds` is for: the district when it has data, otherwise the state. */
  cropArea: string | null;
  loading: boolean;
}

export function useAreaCrops(state: string | null | undefined, district: string | null | undefined): AreaCrops {
  const verified = grownInDistrict(state, district);
  const [dataset, setDataset] = useState<AreaCrops["dataset"]>(null);
  const [inState, setInState] = useState<CropId[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setDataset(null);
    setInState([]);
    if (!state) return;
    let alive = true;
    setLoading(true);
    void loadStateCrops(state).then((f) => {
      if (!alive) return;
      const crops = f && district ? districtStats(f, district) : null;
      setDataset(f && crops ? { source: f.source, crops } : null);
      setInState(f ? stateCropIds(f) : []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [state, district]);
  const ids = new Set<CropId>(verified?.crops ?? []);
  for (const c of dataset?.crops ?? []) if (c.cropId) ids.add(c.cropId);
  if (ids.size > 0) return { verified, dataset, cropIds: [...ids], cropArea: district ?? null, loading };
  const stateIds = new Set<CropId>([...grownInState(state), ...inState]);
  return { verified, dataset, cropIds: [...stateIds], cropArea: stateIds.size > 0 ? state ?? null : null, loading };
}
