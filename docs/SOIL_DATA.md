# Soil data: what the app uses, where to get real data, and what I need from you

## The village-wise soil dataset (`soil-dataset.csv`)

The raw file is **1.18 GB**, and GitHub rejects any file over 100 MB, so **it is never committed** (`.gitignore` excludes `/*.csv`). Instead it is converted once into small JSON files that *are* committed and that the app loads on demand:

| File | What's in it | Size |
| --- | --- | --- |
| `public/data/soil/index.json` | List of states, district counts, source text | 4 KB |
| `public/data/soil/<state>.json` | Each district's totals, and the path to its village file | 1–19 KB |
| `public/data/soil/<state>/<district>.json` | Every village's counts, grouped by block | mostly 10–200 KB, all under 1 MB |

The total is about 26 MB in 771 files.

**What the raw file contains.** Each row is one village × parameter × level, with `value` = number of soil samples in that level (e.g. Nitrogen, Low, 12). There are **no measured values** (no kg/ha), only these counts, so the app shows percentages ("Nitrogen: Low 79%"), not medians.

**Each village is stored as 29 numbers.** That's the counts in a fixed order (pH acidic/neutral/alkaline, EC normal/saline, OC/N/P/K low/medium/high, then S, Zn, Fe, Cu, Mn, B deficient/sufficient). See `LEVELS` in `lib/soil/nutrientStatus.ts`. Both years are added together.

**Known gap in the data:** not every sample is tested for every parameter. In Dehradun, for example, nitrogen was reported for only 9,082 of about 17,800 samples. The app shows the number of tests next to each parameter so this is visible.

**To rebuild** (about 20 seconds), with the raw file in the project folder:

```bash
npm run soil:build -- soil-dataset.csv --source "Soil Health Card scheme, village-wise nutrient status 2023-24 and 2024-25 (Dept. of Agriculture & Farmers Welfare)"
```

- The `--source` text is shown to farmers under the results. **Update it with the exact website and download date** of your copy of the file.
- Output goes to `public/data/soil/`. `npm run build:standalone` copies it next to `index.html` as `data/soil/`.
- District names are matched to the app's district list (`lib/location/districts.ts`, `DISTRICT_ALIASES`). The script prints any it couldn't match. Three are left (Dibang Valley, Bengaluru South, Meluri), because they are old or new districts that the app's list doesn't have.

## What is in the app now

| Feature | Data | Status |
| --- | --- | --- |
| **My Soil Health Card**: the farmer types the 12 values from their card and sees ratings | Official critical limits from ICAR-Indian Institute of Soil Science (Harit Dhara 4(1), 2021, Table 1) | Built and tested. The limits are copied exactly, boundaries are unit-tested, and Kisaan Saathi uses the results when answering. |
| **Soil moisture and temperature now** | Open-Meteo weather model (same free service as the forecast) | Built and tested with mocked data. It's an **estimate for about 1 km**, not a measurement, and the app says so. |
| **Soil tests in your area**: share of tests that are low/medium/high (or deficient/sufficient) for each of the 12 parameters, for the farmer's district, block or village | Village-wise nutrient status, 2023-24 and 2024-25 (`soil-dataset.csv`, 10.85 million rows, 32 states, 738 districts, 287,000 villages), converted into `public/data/soil/` | Built. Totals checked against the raw file. |
| **Your own soil test file** (under "Have your own soil test file?"): load a CSV with measured values and see the median of tests near the farm | Any village-wise file with measured values | Built and tested with synthetic files. |

Official limits used (ICAR-IISS Table 1):

| Parameter | Limits |
| --- | --- |
| pH | below 6.5 acidic; 6.5–7.0 neutral; above 7.0 alkaline |
| EC | above 4.0 dS/m saline |
| Organic carbon | below 0.50% low; 0.50–0.75% medium; above 0.75% high |
| N | below 280 kg/ha low; 280–560 medium; above 560 high |
| P | below 10 kg/ha low; 10–25 medium; above 25 high |
| K | below 120 kg/ha low; 120–280 medium; above 280 high |
| S | deficient below 10 mg/kg |
| Zn | deficient below 0.6 mg/kg |
| Cu | deficient below 0.2 mg/kg |
| Fe | deficient below 4.5 mg/kg |
| Mn | deficient below 2.0 mg/kg |
| B | deficient below 0.5 mg/kg |

Some websites quote 108 or 110 kg/ha for low potassium; the app follows ICAR-IISS (120).

**What the app deliberately does not do:** give fertilizer amounts. Every Soil Health Card already prints crop-wise doses calculated by the government system from that field's test, so the app tells farmers to follow their card or ask the KVK.

## Where real soil data comes from

1. **The farmer's own Soil Health Card (best, field-level).**
   - Paper card, or download from the portal: https://www.soilhealth.dac.gov.in/HealthCard/HealthCard/HealthCardPublic
   - No card yet? The block agriculture office or KVK takes the sample.
2. **Village-wise test results (area level).**
   - The Soil Health Card portal (soilhealth.dac.gov.in, run by NIC for the Agriculture Ministry) publishes public reports, including nutrient status grid-wise, village-wise and block-wise, and a nutrient dashboard.
   - **There is no public API**, so the data must be downloaded from the portal's reports, or obtained from your state agriculture department.
   - Compilations of the portal's village-wise data with coordinates exist. For example, Dataful has one for Uttar Pradesh (2024-25). Check its licence and whether your state and district are covered before using it.
3. **Global soil maps (research use only).**
   - ISRIC SoilGrids gives modelled pH, texture and carbon at 250 m. **Its REST API is paused** by ISRIC with no restore date, so the app does not depend on it.
   - Its map files can be downloaded for offline analysis (https://files.isric.org/soilgrids/latest/data/).
4. **Soil maps and surveys.** ICAR-NBSS&LUP, the national soil survey bureau, publishes soil survey maps. These are useful for a project report, not for per-field advice.

## What I need from you to make the area data work

1. **Choose the district(s)** you're piloting in. Dehradun is already supported for crops.
2. **Get one village-wise soil test file (CSV) for that district.** Either:
   - **Soil Health Card portal:** open the public reports, choose the "Nutrient Status – Village Wise" style report for your state, district and year, and export or save it as CSV (Excel can save as CSV). Or:
   - **State agriculture department or your KVK:** ask for the district's soil test results (village, latitude/longitude if available, pH, EC, OC, N, P, K, S, Zn, Fe, Cu, Mn, B). A college project letter from your department helps.
3. **Load it** in the app: My Soil → "Choose CSV file".
   - The app recognises common column names: `ph`, `nitrogen_kg_per_hectare`, `organic_carbon_percentage`, `zinc_ppm`, `latitude`/`longitude`, `village`, `district`, and short ones like `N`, `P`, `K`, `OC`.
   - If it says "no soil columns found", send me the header row and I'll add those names.
4. **Tell me the file's source and year.** I'll record it in `lib/sources.ts` so it's cited like everything else.
5. **Optional, for everyone using the website:** if you want the district summary built in rather than loaded per phone, send me the file and its licence or permission. I'll add it as verified data.

Also needed from you:
- **A Gemini API key** (free, from https://aistudio.google.com/apikey) for the assistant. Paste it in the app; never put it in the file.
- **An agronomist or KVK review** of the rating wording before real farmers use it.
