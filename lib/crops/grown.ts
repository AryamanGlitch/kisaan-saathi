import type { SourceId } from "../sources.ts";
import type { CropId } from "./catalog.ts";
import { normDistrict } from "../location/districtMatch.ts";

/**
 * Crops recorded as grown in a district, from official ICAR-CRIDA district plans.
 * Only crops named in the cited sections are listed (major crops; minor crops may be missing).
 */
export interface DistrictGrown {
  state: string;
  district: string;
  crops: CropId[];
  sourceId: SourceId;
  sections: string;
}

export const DISTRICT_GROWN: DistrictGrown[] = [
  {
    state: "Uttarakhand", district: "Dehradun", sourceId: "crida-dehradun", sections: "1.12, 1.13",
    crops: ["wheat", "rice", "maize", "sugarcane", "barnyard-millet", "mustard", "potato", "pea", "tomato", "mango"],
  },
  {
    state: "Uttarakhand", district: "Haridwar", sourceId: "crida-haridwar", sections: "1.7, 1.11",
    crops: ["rice", "wheat", "sugarcane", "lentil", "groundnut", "mustard", "potato", "mango", "litchi", "citrus"],
  },
  {
    state: "Uttarakhand", district: "Almora", sourceId: "crida-almora", sections: "1.7, 1.11, 1.12",
    crops: ["rice", "finger-millet", "barnyard-millet", "maize", "horsegram", "soybean", "wheat", "barley", "lentil",
      "pea", "tomato", "capsicum", "french-bean", "onion", "apple", "pear", "peach", "plum", "apricot", "walnut", "citrus", "mango"],
  },
];

export function grownInDistrict(state: string | null | undefined, district: string | null | undefined): DistrictGrown | null {
  if (!state || !district) return null;
  const d = normDistrict(district.replace(/\(.*\)/, ""));
  const s = state.toLowerCase();
  return DISTRICT_GROWN.find((g) => g.state.toLowerCase() === s && normDistrict(g.district) === d) ?? null;
}

/** Every crop on the verified district lists of a state (used when the district has no list of its own). */
export function grownInState(state: string | null | undefined): CropId[] {
  if (!state) return [];
  const s = state.toLowerCase();
  return [...new Set(DISTRICT_GROWN.filter((g) => g.state.toLowerCase() === s).flatMap((g) => g.crops))];
}
