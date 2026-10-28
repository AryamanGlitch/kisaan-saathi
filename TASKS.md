# TASKS — Kisaan Saathi

_Last updated: 28 Oct 2026. The current status is in "Ready to deploy (28 Oct 2026)" below; older sections are kept as a record._

## Ready to deploy (28 Oct 2026)

Ran on a real machine, with network:

| Check | Result |
| --- | --- |
| `npm run typecheck` | **0 errors** (the old `cache.test.ts` error is fixed) |
| `npm run lint` | **0 problems** |
| `npm test` | **138/138 pass** |
| `next build` and `npm run build:standalone` | **Pass** |
| `npm run e2e` (Playwright, Chromium, against the built server) | **11/11 pass**: two outdated tests were updated, and two were added (North Goa location, Back button) |
| Every district through the real location form, in the browser | **788/788 save a location** (209 failed before the district-centre fix) |
| Live Open-Meteo weather and place search | **Works** |
| What would be uploaded to GitHub | 960 files, 27 MB, largest file 284 KB. The raw CSV, `node_modules`, build output and `.env.local` are excluded. |

Done in this round:
- **Soil Health Card data** linked to My Soil (`docs/SOIL_DATA.md`).
- **District centres** for all 788 districts (`docs/DATA_SOURCES.md`).
- **Crop menus** fall back from the district to the state.
- **A sharper background photo.**
- **A Back button** above each page title.
- **The single-file version** no longer asks farmers for an API key.

**Needs you** (step by step in `docs/DEPLOY_VERCEL.md`):
1. Push to GitHub.
2. Import the repository into Vercel.
3. Set `GEMINI_API_KEY` and `NOMINATIM_USER_AGENT`.
4. Deploy, and check the deployment on a phone.
5. Optional: add `DATABASE_URL` and `CRON_SECRET` for scheme monitoring.

**Still open:**
- **Crop statistics CSV for crop menus outside Uttarakhand.** See `docs/CROP_DATA.md`.
- **Source and download date of the soil dataset.** The source line farmers see is a best guess (`docs/SOIL_DATA.md`).
- **The background photo's source or licence.** Credit it if the licence requires it.
- **Expert and user review.** See below.

## Status legend

| Status | Meaning |
| --- | --- |
| **Code** | Implemented |
| **Ran** | Executed and passed in the build environment |
| **Needs you** | Needs credentials or an environment I don't have here |
| **Not built** | Out of scope so far |

## Milestones

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Assessment | Done |
| 2 | Foundation (design, navigation, i18n, dashboard) | Code + Ran (browser scenarios) |
| 3 | Location + weather | Code + Ran (faked upstream) · live APIs: Needs you |
| 4 | Crop recommendations + crop care | Code + Ran |
| 5 | Schemes + daily refresh, utilities + complaints | Code + Ran (in-memory) · PostgreSQL + cron: Needs you |
| 6 | Gemini assistant | Code + Ran (faked Gemini) · live key: Needs you |
| 7 | Integration + tests | Ran: unit, API, browser · Playwright suite on Next: Needs you |
| 8 | Docs + deployment | Code (README, DATA_SOURCES, vercel.json, migrations) |

## What actually ran in the build environment

| Check | Result |
| --- | --- |
| Unit tests (`npm test`, Node test runner) | **Ran: 103/103 pass** |
| Strict typecheck of `lib/` and `scripts/` (strict, noUncheckedIndexedAccess, noUnusedLocals) | **Ran: 0 errors** |
| Structural typecheck of `app/` and `components/` against hand-written React/Next stubs | **Ran: 0 errors** (catches wrong imports, props and state types; not React API misuse) |
| Real API route handlers called over HTTP under Node, with third-party HTTP faked | **Ran: all behaved as designed** (see below) |
| 17 browser scenarios: real React pages bundled with esbuild, Chromium via Playwright, mobile viewport | **Ran: 17/17 pass, no console errors** |
| `npm install`, `next build`, `npm run lint`, `npm run e2e` | **Not run** (no network) |
| Live Open-Meteo, Nominatim, Gemini, PostgreSQL, Vercel Cron | **Not run** (no network or credentials) |
| Visual styling (Tailwind) | **Not checked**: Tailwind can't compile offline, so browser runs were unstyled |

### API behaviour checked through the real route handlers

- Weather returns data; non-Indian coordinates are rejected with 400.
- Place search returns candidates; an unknown state is rejected with 400.
- Schemes come with honest freshness: "not-monitored" without a database, and KCC as "needs-verification".
- Utility contacts are returned with `live: null`.
- The refresh-cron route returns 401 without the secret and 503 without a database.
- The assistant:
  - rejects a bad body with 400
  - replaced a "2 ml/litre" dose with label/KVK guidance
  - dropped the invented citation `invented-123`
  - used weather, sowing-window and scheme context
- Assistant rate limit: 429 after 6 requests per minute.

### Browser scenarios that passed

1. First visit: language picker
2. Manual location, with validation errors (missing fields, PIN starting with 0)
3. GPS allowed
4. GPS denied
5. Dashboard sentence + sowing now + 7 sections
6. Weather with source and the "not official warnings" note
7. Weather provider down, then retry
8. Offline: banner and labelled device copy
9. Grow, irrigated and rain-fed
10. Grow in a district without data
11. Crop care with district problems, dose removed and invented citation hidden
12. Assistant follow-ups, and crisis routing that makes no model call
13. Rejected API key
14. Schemes
15. Utilities and complaint draft
16. Full Hindi run
17. Corrupt saved data discarded

### Bugs found and fixed during testing

1. Base-URL normalization was inconsistent.
2. Timeout tests were cancelled (an unref'd `AbortSignal.timeout` timer; test harness issue only).
3. Hindi section references and the duplicate source line on the What to Grow page.
4. One test assumed Node's Hindi month spelling; Chromium spells it differently. Test fixed; app correct.

## Single-file version (`index.html`)

- **Built here** with `npm run build:standalone`: about 400 KB, one file, no keys inside.
- **13/13 scenarios passed** in Chromium with the file opened from disk (`file://`) and weather, geocoding and Gemini mocked at the network layer. They covered:
  1. language picker
  2. typed location
  3. GPS with state/district picked by the farmer
  4. weather with the rain advisory
  5. weather service down
  6. offline saved copy
  7. sowing suggestions
  8. own-key assistant, with the dose removed and the key sent only in the request header
  9. crisis routing with no model call
  10. schemes and utilities
  11. Hindi
  12. no horizontal scrolling at 360px
  13. a single key form at a time
- **Bug found and fixed:** two copies of the key form didn't stay in sync.
- **Not yet checked live:** real Open-Meteo geocoding and Gemini calls from a browser. Open the file with internet on and try one search and one question.

## Districts and area crops (27 Oct 2026)

**Built:**
- A district dropdown for all 36 states and UTs that changes with the state, plus "My district is not listed".
- GPS picks the official district automatically, trying every map name: district, tehsil and city.
- A "Crops grown in <district>" list.
- Crop menus limited to the district's crops, with "Other crop" to see all.
- The assistant now knows the district's crops.

**Data:**
- 802 districts.
- Verified crop lists for Dehradun, Haridwar and Almora (ICAR-CRIDA).
- Sowing windows added for Haridwar and Almora.
- Converter `npm run crops:build` for the 1.1 GB dataset (see `docs/CROP_DATA.md`). Tested on a 300,000-row file in the government layout: about 1 s, about 3 KB per state.

**Tests:**

| Suite | Result |
| --- | --- |
| Districts and area crops (incl. dataset served over http) | 10/10 |
| Regression | 17/17 |
| Exploratory | 16/16 |
| Location | 9/9 |
| Key | 7/7 |
| Check page | 5/5 |
| Buttons and links | 101/101 |
| Unit tests | 129/129 |

**Fixed:** the app no longer tries to load data files when opened from disk.

**Next:**
1. You run the converter on your dataset and upload `data/`.
2. Add the remaining 10 Uttarakhand district plans. Links:
   - Chamoli UKD4
   - Champawat UKD5
   - Nainital UKD8
   - Pithoragarh UKD9
   - Rudraprayag UKD10
   - Bageshwar UKD11
   - Pauri UKD12
   - Uttarkashi UKD13
   - Tehri and Udham Singh Nagar (on kvk.icar.gov.in)

## Testing round — see docs/TEST_REPORT.md

- **Results:**

  | Suite | Result |
  | --- | --- |
  | Unit tests | 116/116 |
  | Regression scenarios | 17/17 |
  | Exploratory tests | 16/16 (×3 runs) |
  | Check-page conditions | 5/5 |
  | Button audit | 97/97 |

- **Two real bugs fixed:**
  - misleading messages when the browser won't save data
  - a rejected Gemini key reported as "not set up"
- **New "Check the app" page** runs the live checks on your phone and produces a report.

## Soil module and button audit

- **My Soil** page built:
  - Soil Health Card entry, rated with ICAR-IISS limits (boundaries unit-tested)
  - Open-Meteo soil moisture and temperature estimate
  - village-wise CSV import with a nearest-tests summary
  - the saved card is passed to the assistant as cited context
- **Button audit:** 91/91 buttons and links work. The audit found one problem, now fixed: Refresh weather did nothing visible when the forecast was cached. See `docs/BUTTON_AUDIT.md`.
- **Browser scenarios on the single file: 17/17 pass,** including soil, CSV import and preview-mode detection.
- **Unit tests: 116/116.**
- **Needs you:**
  - a real village-wise soil data file for your district (`docs/SOIL_DATA.md`)
  - publishing the file (`docs/PUBLISH_WEBSITE.md`)
  - a Gemini key
- **Not used:** ISRIC SoilGrids. Its REST API is paused by ISRIC.

## Acceptance criteria

| Criterion | Status |
| --- | --- |
| Documented startup | Code |
| Build succeeds | **Needs you** (`npm run build`) |
| Responsive, white KISS design | Code + Ran (layout, flows) · styling unchecked |
| Location by permission or manual entry | Ran |
| Weather from a real provider, unavailable data labelled | Ran with faked provider · live: Needs you |
| Crop suggestions use location, season, irrigation, forecast | Ran (Dehradun only) |
| Crop-care evidence and safety checks | Ran |
| Schemes keep sources and freshness metadata | Ran |
| Scheduled refresh works in deployment | Code + Ran (logic, in-memory) · **Needs you** (Postgres + cron) |
| Utilities from verified sources, honest fallbacks | Ran (Uttarakhand) |
| Gemini works when configured | Ran with faked Gemini · **Needs you** (real key) |
| API keys server-side | Ran (no `NEXT_PUBLIC_` vars; key only in the request header from the server, tested) |
| Critical paths have automated tests | Ran (unit + browser) |
| Error, loading, empty, offline, stale states | Ran |
| Setup and deployment docs | Code |
| Limitations documented | This file + README + docs/DATA_SOURCES.md |

## Do these first (about 30 minutes): superseded by "Ready to deploy" above

1. `npm install && npm run check`, and send me any errors.
2. Set `NOMINATIM_USER_AGENT` and `GEMINI_API_KEY`, then `npm run dev`. Check:
   - real weather for your location
   - one assistant question in Hindi and one in English
3. `npx playwright install chromium && npm run e2e`.
4. Create a PostgreSQL database, set `DATABASE_URL`, then run `npm run db:migrate` and `npm run schemes:refresh`. The first run sets baselines; a second run should report no changes.
5. Deploy to Vercel, set `CRON_SECRET`, and trigger the cron once from the dashboard.

## Known limitations

- **Coverage:**
  - Sowing windows and problem lists exist for Dehradun only.
  - Utility contacts exist for Uttarakhand only.
  - No state schemes are included.
  - Elsewhere the app says "no verified data".
- **The ICAR-CRIDA plan is from 2014.** It is shown with its date and a "confirm with KVK" note.
- **Scheme change detection is a fingerprint, not a parser.** Dynamic pages may cause false "page changed" flags, which need a person to re-verify.
- **No pesticide recommendation database.** The app never gives products or doses. Integrating CIB&RC approved-use data would be the next step, with expert review.
- **No image-based diagnosis.** It was not built; photos would need a validated model and agronomist review.
- **Infrastructure:** rate limits and caches are per server instance. Public Nominatim isn't suitable for production traffic.
- **No Content-Security-Policy header yet.** Other security headers are set.
- **Voice input/output was not built.** It may matter more than text for low-literacy users.

## Needs expert or user review (before real farmers use it)

- An agronomist or KVK should review the weather advisory thresholds, the crop-care safety text and the assistant system prompt, using 30–50 test questions and a rubric.
- A native speaker, ideally with farmers, should review the Hindi text, including pest and disease names.
- Usability sessions with 5–8 farmers: task completion for "set location", "what to sow" and "call about a power cut".

## Next concrete step

Run "Do these first", then add the next district (ideally from the same ICAR-CRIDA series) following `docs/DATA_SOURCES.md`.
