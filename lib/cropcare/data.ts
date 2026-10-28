import type { SourceId } from "../sources.ts";
import type { CropId } from "../crops/catalog.ts";

/**
 * Pests and diseases REPORTED for a district in an official plan.
 * This is "known in your area", never a diagnosis. Source: ICAR-CRIDA Dehradun plan (2014),
 * section 1.13 "Pests and disease outbreak". Hindi names need review by an extension expert.
 */
export interface ReportedProblem {
  id: string;
  en: string;
  hi: string;
  type: "pest" | "disease";
}

export interface DistrictProblems {
  state: string;
  district: string;
  sourceId: SourceId;
  sourceSection: string;
  byCrop: Partial<Record<CropId, ReportedProblem[]>>;
}

export const DISTRICT_PROBLEMS: DistrictProblems[] = [
  {
    state: "Uttarakhand",
    district: "Dehradun",
    sourceId: "crida-dehradun",
    sourceSection: "1.13",
    byCrop: {
      wheat: [
        { id: "yellow-rust", en: "Yellow rust", hi: "पीला रतुआ", type: "disease" },
        { id: "loose-smut", en: "Loose smut", hi: "खुला कंडुआ", type: "disease" },
        { id: "covered-smut", en: "Covered smut", hi: "ढका कंडुआ", type: "disease" },
        { id: "karnal-bunt", en: "Karnal bunt", hi: "करनाल बंट", type: "disease" },
        { id: "wheat-aphid", en: "Wheat aphid", hi: "गेहूँ का माहू", type: "pest" },
      ],
      rice: [
        { id: "stem-borer", en: "Stem borer", hi: "तना छेदक", type: "pest" },
        { id: "leaf-folder", en: "Leaf folder", hi: "पत्ती लपेटक", type: "pest" },
        { id: "brown-plant-hopper", en: "Brown plant hopper", hi: "भूरा फुदका", type: "pest" },
        { id: "blast", en: "Blast", hi: "झोंका रोग (ब्लास्ट)", type: "disease" },
        { id: "bacterial-leaf-blight", en: "Bacterial leaf blight", hi: "जीवाणु पत्ती झुलसा", type: "disease" },
        { id: "brown-leaf-spot", en: "Brown leaf spot", hi: "भूरा पत्ती धब्बा", type: "disease" },
        { id: "false-smut", en: "False smut", hi: "आभासी कंड", type: "disease" },
      ],
      maize: [
        { id: "maize-stem-borer", en: "Maize stem borer", hi: "मक्का का तना छेदक", type: "pest" },
        { id: "stalk-rot", en: "Bacterial (Erwinia) stalk rot", hi: "जीवाणु तना सड़न", type: "disease" },
        { id: "maydis-leaf-blight", en: "Maydis leaf blight", hi: "मेडिस पत्ती झुलसा", type: "disease" },
        { id: "leaf-sheath-blight", en: "Leaf sheath blight", hi: "पर्णच्छद झुलसा", type: "disease" },
      ],
      mustard: [
        { id: "mustard-aphid", en: "Mustard aphid", hi: "सरसों का माहू", type: "pest" },
        { id: "cabbage-butterfly", en: "Cabbage butterfly", hi: "गोभी की तितली", type: "pest" },
        { id: "alternaria-blight", en: "Alternaria blight", hi: "अल्टरनेरिया झुलसा", type: "disease" },
        { id: "white-rust", en: "White rust", hi: "सफ़ेद रतुआ", type: "disease" },
      ],
      potato: [
        { id: "late-blight", en: "Late blight", hi: "पछेती झुलसा", type: "disease" },
        { id: "early-blight", en: "Early blight", hi: "अगेती झुलसा", type: "disease" },
      ],
      pea: [
        { id: "powdery-mildew", en: "Powdery mildew", hi: "चूर्णिल आसिता (पाउडरी मिल्ड्यू)", type: "disease" },
        { id: "leaf-miner", en: "Leaf miner", hi: "पत्ती सुरंगक", type: "pest" },
      ],
      tomato: [
        { id: "fruit-fly", en: "Fruit fly", hi: "फल मक्खी", type: "pest" },
        { id: "buckeye-rot", en: "Buckeye rot", hi: "बकआई सड़न", type: "disease" },
      ],
      mango: [
        { id: "mango-hopper", en: "Mango hopper", hi: "आम का भुनगा", type: "pest" },
        { id: "shoot-gall-psylla", en: "Shoot gall psylla", hi: "शूट गॉल सिल्ला", type: "pest" },
        { id: "mealy-bug", en: "Mealy bug", hi: "मिलीबग (गुजिया कीट)", type: "pest" },
        { id: "mango-fruit-fly", en: "Fruit fly", hi: "फल मक्खी", type: "pest" },
      ],
    },
  },
];

export function findDistrictProblems(state: string, district: string): DistrictProblems | null {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  return DISTRICT_PROBLEMS.find((d) => n(d.state) === n(state) && n(d.district) === n(district)) ?? null;
}

export type GrowthStage = "seedling" | "vegetative" | "flowering" | "fruiting" | "maturity" | "unknown";
export const GROWTH_STAGES: GrowthStage[] = ["seedling", "vegetative", "flowering", "fruiting", "maturity", "unknown"];
export type PlantPart = "leaves" | "stem" | "roots" | "flowers" | "fruit" | "whole";
export const PLANT_PARTS: PlantPart[] = ["leaves", "stem", "roots", "flowers", "fruit", "whole"];
