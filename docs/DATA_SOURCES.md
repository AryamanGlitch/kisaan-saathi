# Data source register

Every fact the app shows comes from a source listed here, or from a live API with its own timestamp. **Nothing may be added without a source.** If a fact can't be verified, leave the field `null`; the UI then says "not verified".

## Registered sources (`lib/sources.ts`)

All were opened or read on **26 Oct 2026**.

| Id | What we use from it | Document date | Notes |
| --- | --- | --- | --- |
| `crida-dehradun` | Sowing windows (sec. 1.12), reported pests and diseases (sec. 1.13), KVK contact | 10 Jul 2014 | Old: shown with its date. Its chemical spray advice is deliberately **not** used. |
| `pmkisan-pib-faq`, `pmkisan-portal` | ₹6,000/year in 3 instalments of ₹2,000; eligibility; Aadhaar and bank details; registration link | 2021 / live | |
| `pmfby-pib-faq`, `pmfby-portal` | Farmer premium caps 2% / 1.5% / 5% | 2021 / live | The PMFBY helpline number was **not** verified on an official page, so it's omitted. |
| `miss-pmindia-2025` | KCC loans ≤ ₹3 lakh at 7%, 3% prompt-repayment incentive | 28 May 2025 | Approved for FY 2025-26 only, so marked "needs verification". |
| `shc-pib-2025`, `shc-portal` | Soil Health Card purpose and portal | Aug 2025 / live | Sources say both "every 2 years" and "every 3 years"; the conflict is shown. |
| `upcl-contact` | UPCL toll-free 1912, customercare@upcl.org | live | |
| `ujs-customer-care` | Jal Sansthan 1800-180-4100 and 1916 | page about 19 months old | |
| `kcc-mkisan` | Kisan Call Centre 1800-180-1551 | live | |
| `telemanas-vikaspedia` | Tele-MANAS 14416 / 1-800-891-4416 | live | Used only in crisis responses. |
| `open-meteo` | Live forecast | live | Forecast model, not official warnings. |

The national emergency number **112** is used in crisis responses.

## Added 27 Oct 2026

| Data | Source | Notes |
| --- | --- | --- |
| District list (802, all states/UTs) | Wikipedia "List of districts in India" (as of 9 Dec 2025), which cites igod.gov.in | Official source: Local Government Directory (lgdirectory.gov.in). Renamed districts show the official name with the old name in brackets. A small typo was corrected (Gadaga → Gadag). |
| Crops grown: Dehradun, Haridwar, Almora | ICAR-CRIDA district contingency plans (2013–2014), sections 1.7, 1.11, 1.12, 1.13 | Major crops only. The remaining 10 Uttarakhand plans are linked in `TASKS.md` for the next pass. |
| Sowing windows: Haridwar, Almora | Same plans, section 1.12 | Entries where the table doesn't show which crop or regime they belong to were left out. |

## District centres (28 Oct 2026)

`lib/location/districtCoords.ts` holds a centre point for each of the 788 districts in `lib/location/districts.ts`. Choosing a district therefore always gives a location for weather and area data, even when the live place search finds nothing.

- **Why:** the single-file version's place search (Open-Meteo) only knows towns and villages. Before this, 209 of 788 districts found nothing, including all of Goa, Meghalaya and Delhi, so the location never saved.
- **Source:** OpenStreetMap district boundaries via Nominatim, built once by `scripts/build-district-coords.ts` at 1 request per second. Data © OpenStreetMap contributors, ODbL 1.0. Keep the attribution.
- **Exceptions:**
  - About 20 districts used OpenStreetMap's own spelling (in `OSM_NAMES` in the script).
  - A few new districts (e.g. Changthang, Shravasti) use the headquarters town.
  - Leh and Kargil use their headquarters towns, because their geometric centres are in uninhabited mountains.
- **Checked:**
  - **Against towns:** 480 district centres were compared with the same-named town in that district. The median distance is 16 km, and 95% are within 39 km.
  - **Duplicates and outliers:** no two districts share a point, and none lies far outside its state.
  - **In the browser:** every one of the 788 districts was saved through the real form.
- **Adding a district:** add it to `districts.ts` and run the script (only missing districts are looked up). A unit test fails until every district has a centre.

## Needs expert review before public launch

- **Weather advisory thresholds** in `lib/weather/advisories.ts`: spray-rain 60% or 5 mm, wind 15 km/h, heat 40 °C, cold 4 °C. These are app heuristics. The 64.5 mm heavy-rain figure is IMD's "heavy rainfall" lower bound, from memory; add a citation.
- **Hindi names of pests and diseases** in `lib/cropcare/data.ts`, and all Hindi UI text.
- **General pesticide safety text** (`care.safety*` strings).

## Adding a district (sowing windows)

1. Find the district's ICAR-CRIDA contingency plan (icar-crida.res.in, "CP"), or a newer state agricultural university package of practices.
2. Add a `SourceRef` to `lib/sources.ts` with the URL, document date and today's date.
3. Add a `DistrictCropData` entry to `lib/crops/data.ts`. Copy windows exactly, keeping the source's own wording in `sourceText`.
4. Keep `durationDays: null` unless the same source states it.
5. Run `npm test`. The integrity tests reject unknown source ids, bad windows and non-https URLs.

## Adding a scheme

1. Read the official guideline or FAQ (ministry portal, PIB, myScheme).
2. Add a `SchemeRecord` to `lib/schemes/data.ts`:
   - English and Hindi text for every field, or `null` where a field is unverified.
   - `lastVerified` set to today.
   - `watchUrls` pointing to the official page(s) to monitor.
3. If any figure is tied to a past period, set `status: "needs-verification"` and explain why in `statusNote`.
4. After deploy, the next daily run sets a new baseline for the record's pages.

## Re-verifying after "official page changed"

1. Open the official page and compare it with the record.
2. Update the record and set a new `lastVerified` date.
3. Deploy. The next run re-baselines, and the warning clears.

## Adding a utility or a live supply feed

- **Contacts:** add a `UtilityRecord` in `lib/utilities/data.ts`, using contacts copied from the utility's own website.
- **Live feed:** implement `LiveFeedAdapter` (`lib/utilities/feeds.ts`), register it in `FEED_ADAPTERS`, and set `liveFeed` on the utility. Use it only if the utility publishes a feed you are allowed to use. The adapter must return its own source URL and observation time.
