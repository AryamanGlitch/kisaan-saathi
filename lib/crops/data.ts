import type { DistrictCropData } from "./types.ts";

/**
 * VERIFIED DATA ONLY. Each window below is copied from the cited source section.
 * ICAR-CRIDA Dehradun plan (2014), section 1.12 "Sowing window for 5 major field crops".
 * Crop durations are not given in that section, so they stay null.
 */
export const DISTRICT_CROP_DATA: DistrictCropData[] = [
  {
    state: "Uttarakhand",
    district: "Dehradun",
    aliases: ["dehradun", "dehra dun"],
    sourceId: "crida-dehradun",
    sourceSection: "1.12",
    kvk: {
      name: "Krishi Vigyan Kendra, Dhakrani, Dehradun",
      phone: "01360-224378",
      email: "kvkdehradun@gmail.com",
      sourceId: "crida-dehradun",
    },
    records: [
      {
        cropId: "wheat",
        durationDays: null,
        windows: [
          { regime: "rainfed", season: "rabi", start: { month: 10 }, end: { month: 10 }, sourceText: "Rabi, rainfed: October" },
          { regime: "irrigated", season: "rabi", start: { month: 10 }, end: { month: 12 }, sourceText: "Rabi, irrigated: October – December" },
        ],
      },
      {
        cropId: "rice",
        durationDays: null,
        windows: [
          { regime: "rainfed", season: "kharif", start: { month: 4 }, end: { month: 6 }, sourceText: "Kharif, rainfed: April – June" },
          { regime: "irrigated", season: "kharif", start: { month: 6, week: 1 }, end: { month: 7, week: 4 }, sourceText: "Kharif, irrigated: 1st week of June to 4th week of July" },
        ],
      },
      {
        cropId: "maize",
        durationDays: null,
        windows: [
          { regime: "rainfed", season: "kharif", start: { month: 5 }, end: { month: 7 }, sourceText: "Kharif, rainfed: May – July" },
          { regime: "irrigated", season: "kharif", start: { month: 6 }, end: { month: 7 }, sourceText: "Kharif, irrigated: June – July" },
        ],
      },
      {
        cropId: "sugarcane",
        durationDays: null,
        windows: [
          { regime: "irrigated", season: "annual", start: { month: 2 }, end: { month: 3 }, sourceText: "Irrigated: planted February/March, crop until next March" },
        ],
      },
      {
        cropId: "barnyard-millet",
        durationDays: null,
        windows: [
          { regime: "rainfed", season: "kharif", start: { month: 4 }, end: { month: 5 }, sourceText: "Kharif, rainfed: April – May" },
        ],
      },
    ],
  },
  {
    // ICAR-CRIDA Haridwar plan (2013), section 1.12. Lentil and mustard windows are omitted:
    // the extracted table does not show clearly whether they are rainfed or irrigated.
    state: "Uttarakhand",
    district: "Haridwar",
    aliases: ["haridwar", "hardwar"],
    sourceId: "crida-haridwar",
    sourceSection: "1.12",
    kvk: { name: "Krishi Vigyan Kendra, Dhanauri, Haridwar", phone: "9411177299", email: "kvkharidwar@gmail.com", sourceId: "crida-haridwar" },
    records: [
      { cropId: "rice", durationDays: null, windows: [{ regime: "irrigated", season: "kharif", start: { month: 6, week: 2 }, end: { month: 7, week: 2 }, sourceText: "Kharif, irrigated: 2nd week of June to 2nd week of July" }] },
      { cropId: "wheat", durationDays: null, windows: [{ regime: "irrigated", season: "rabi", start: { month: 11, week: 2 }, end: { month: 12, week: 4 }, sourceText: "Rabi, irrigated: 2nd week of November to 4th week of December" }] },
    ],
  },
  {
    // ICAR-CRIDA Almora plan (2013), section 1.12. The single kharif-irrigated entry ("May–June") is
    // omitted because the table does not show which crop it belongs to.
    state: "Uttarakhand",
    district: "Almora",
    aliases: ["almora"],
    sourceId: "crida-almora",
    sourceSection: "1.12",
    kvk: { name: "Krishi Vigyan Kendra, Matela, Almora", phone: "05962-241248", email: null, sourceId: "crida-almora" },
    records: [
      { cropId: "finger-millet", durationDays: null, windows: [{ regime: "rainfed", season: "kharif", start: { month: 6 }, end: { month: 7 }, sourceText: "Kharif, rainfed: June – July" }] },
      { cropId: "rice", durationDays: null, windows: [{ regime: "rainfed", season: "kharif", start: { month: 4 }, end: { month: 5 }, sourceText: "Kharif, rainfed: April – May" }] },
      { cropId: "barnyard-millet", durationDays: null, windows: [{ regime: "rainfed", season: "kharif", start: { month: 5 }, end: { month: 6 }, sourceText: "Kharif, rainfed: May – June" }] },
      { cropId: "maize", durationDays: null, windows: [{ regime: "rainfed", season: "kharif", start: { month: 6 }, end: { month: 7 }, sourceText: "Kharif, rainfed: June – July" }] },
      { cropId: "wheat", durationDays: null, windows: [
        { regime: "rainfed", season: "rabi", start: { month: 10 }, end: { month: 11 }, sourceText: "Rabi, rainfed: October – November" },
        { regime: "irrigated", season: "rabi", start: { month: 11 }, end: { month: 12 }, sourceText: "Rabi, irrigated: November – December" },
      ] },
      { cropId: "barley", durationDays: null, windows: [{ regime: "rainfed", season: "rabi", start: { month: 10 }, end: { month: 11 }, sourceText: "Rabi, rainfed: October – November" }] },
      { cropId: "lentil", durationDays: null, windows: [{ regime: "rainfed", season: "rabi", start: { month: 10 }, end: { month: 11 }, sourceText: "Rabi, rainfed: October – November" }] },
    ],
  },
];
