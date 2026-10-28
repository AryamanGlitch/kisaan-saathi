# Kisaan Saathi · किसान साथी

A bilingual (Hindi/English), mobile-first farming assistant for Indian farmers. It covers weather, what to sow, crop problems, government schemes, electricity and water contacts, and an AI assistant (Gemini). Its rule throughout: **show verified information with its source, or say plainly that we don't have it.**

## What works and how it was verified

| Section | What it does | Data |
| --- | --- | --- |
| My Farm | GPS (explained first) or typed state/district/village/PIN, confirmed on the map; irrigation and main crop. Every one of the 788 listed districts works without a live search (bundled district centres) | OpenStreetMap (Nominatim; district centres in `lib/location/districtCoords.ts`) |
| Weather | Current conditions, 7-day forecast, farm advice (spraying, heavy rain, heat, cold), offline copy | Open-Meteo (forecast, not IMD warnings) |
| What to Grow | Crops whose official sowing window matches your date and irrigation; forecast risks; source and date shown | ICAR-CRIDA district contingency plans |
| Crop Care | Problems reported in your district, soil-test fertilizer guidance, pesticide safety, AI help | ICAR-CRIDA, Soil Health Card |
| Government Schemes | 4 verified central schemes, honest freshness labels, daily source-change detection | Official portals, PIB, PMIndia |
| My Soil | Rate your Soil Health Card values with official ICAR-IISS limits; live soil moisture estimate; soil test results for your district, block or village (32 states, 287,000 villages) | ICAR-IISS limits, Open-Meteo, Soil Health Card village-wise nutrient status 2023-24 & 2024-25 |
| Electricity & Water | Verified official contacts; complaint drafts the farmer sends themselves | UPCL, Uttarakhand Jal Sansthan sites |
| Ask Kisaan Saathi | Gemini assistant with follow-up questions, grounded context, safety guards | Gemini API (server-side) |

**Coverage today:**
- Sowing windows and district problem lists are verified for **Dehradun district (Uttarakhand)** only.
- Utility contacts are verified for **Uttarakhand** only.
- Other places get an honest "no verified data yet" rather than guesses.
- See `docs/DATA_SOURCES.md` for how to add regions.

Verification status of every item is recorded in `TASKS.md`. In short:

- **Ran and passed (28 Oct 2026):**
  - 138 unit tests, a strict typecheck with 0 errors, and lint with 0 problems
  - `next build` and the single-file build
  - 11 Playwright browser tests against the built server (`npm run e2e`), with third-party services faked
  - live Open-Meteo weather and place search, and every one of the 788 districts saved through the real location form
- **Not yet run:**
  - a live deployment
  - live Gemini answers on the server (needs your key in the environment)
  - PostgreSQL scheme monitoring

## Single-file version (`index.html`)

You can also build the whole app as **one file you open directly in a browser**, with no install and no server: `npm run build:standalone` writes `standalone/dist/index.html` (about 740 KB, including the background photo). Pages link with `#/weather`-style addresses.

Because a file has no server, it differs from the server version in three ways, and the app says so where each applies:

| | Server version | Single-file version |
| --- | --- | --- |
| Assistant | Works for everyone; the key is a server environment variable | **Off for farmers** (they see the Kisan Call Centre instead). A developer can switch it on in their own browser from the footer's "Check the app" page; the key stays in that browser. **Never type a key into the file.** |
| Place search | Nominatim (OpenStreetMap) | Typed places: Open-Meteo geocoding (no key). GPS area names: OpenStreetMap Nominatim called from the browser (cached, at most 1 request per second). If that lookup fails, the farmer picks state and district. |
| Daily scheme check | Cron + PostgreSQL | Not available. Schemes show "automatic checking is not active" and their verification date. |

Use it as an offline demo. It still needs the internet for weather and place search. **To put the app online for farmers, see `docs/DEPLOY_VERCEL.md`** (server version). For the single file, see `docs/PUBLISH_WEBSITE.md`. Soil data sources and what's needed: `docs/SOIL_DATA.md`. Every button was audited: `docs/BUTTON_AUDIT.md`. The last weather is kept for offline viewing. For a public launch, use the server version so no one has to handle API keys.

## Requirements

- Node.js 22.18+ or 24.x. Use your line's latest security release.
- PostgreSQL 14+ (only for the daily scheme check)
- A Gemini API key (only for the assistant)

## Run locally

```bash
npm install
cp .env.example .env.local      # then fill it in (see Configuration)
npm run dev                     # http://localhost:3000
```

Without any keys the app still runs:
- Weather works (Open-Meteo needs no key for non-commercial use).
- The crisis safety responses work.
- Place search, the AI assistant and scheme monitoring show clear "not set up" messages.

GPS only works on `https://` or `localhost`. To test on a phone: `npx next dev --experimental-https`.

## Configuration

All variables are **server-only**. Never use the `NEXT_PUBLIC_` prefix, and never commit `.env.local`.

| Variable | Needed for | Notes |
| --- | --- | --- |
| `NOMINATIM_USER_AGENT` | Place search and GPS place names | App name plus a real contact, as the Nominatim policy requires |
| `NOMINATIM_BASE_URL` | Optional | Self-hosted or commercial Nominatim for production traffic |
| `OPEN_METEO_BASE_URL`, `OPEN_METEO_API_KEY` | Optional | Free tier is non-commercial; set both for a paid plan |
| `GEMINI_API_KEY` | Assistant | From Google AI Studio |
| `GEMINI_MODEL` | Optional | Default `gemini-3.5-flash`; check Google's current model list, since ids get retired |
| `DATABASE_URL` | Scheme monitoring | `postgres://…`; then run `npm run db:migrate` |
| `CRON_SECRET` | Scheme monitoring | 16+ random characters |
| `MONITOR_USER_AGENT` | Optional | Identifies the monitor to government sites |

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests (Node's built-in runner) |
| `npm run typecheck`, `npm run lint` | Static checks |
| `npm run e2e` | Playwright browser tests (starts the dev server; run `npx playwright install chromium` once) |
| `npm run check` | typecheck + lint + unit tests + build |
| `npm run db:migrate` | Create or upgrade database tables |
| `npm run schemes:refresh` | Run the scheme source check once (for system cron or CI) |
| `npm run build:standalone` | Build the single-file `index.html` (copies `public/data` next to it) |
| `node --experimental-strip-types scripts/build-district-coords.ts` | Rebuild district centres from OpenStreetMap after adding districts (only missing ones are looked up; see `docs/DATA_SOURCES.md`) |
| `npm run soil:build -- <csv> --source "…"` | Convert the 1.18 GB soil dataset into `public/data/soil/` (see `docs/SOIL_DATA.md`) |
| `npm run crops:build -- <csv> --source "…" --out public/data/crops` | Convert crop statistics into per-state files (see `docs/CROP_DATA.md`) |

## How the trust rules are enforced

- **Structured engine, not AI, for crop suggestions.**
  - `lib/crops/engine.ts` only suggests crops whose official sowing window matches the date.
  - Durations, water needs and soil fit are `null` when the source doesn't state them, and the UI says so.
- **Assistant guardrails** (`lib/assistant/`):
  - **Grounded context.** The model gets verified context (weather, sowing windows, schemes, helplines) and must cite only those source ids. Other citations are dropped.
  - **No doses.** A dose filter removes text like "2 ml/litre" or "120 kg/ha" and replaces it with label and KVK guidance. The app has no verified pesticide or fertilizer dosage database.
  - **Crisis routing.** Self-harm and poisoning messages, in Hindi, romanized Hindi and English, get a fixed response with Tele-MANAS 14416 and 112. They never reach the model, are never rate-limited, and this works without an API key. Keywords can't cover every wording, so the model can also flag a message as crisis or poisoning; the app then shows the same fixed response instead of the model's text. Add any missed wording to the phrase lists in `lib/assistant/assistant.test.ts`.
  - **Validation and limits.** Model output must match a JSON schema, or the user sees an error. Requests are limited to 6 per minute per client and 60 per minute per server instance.
- **Schemes** (`lib/schemes/`):
  - Figures are entered by a person from official sources, with a verification date.
  - A daily job fingerprints each official page. If it changes, the scheme shows "official page changed — confirm on the website".
  - Failures never erase the last good check. Without a database the app says "automatic checking is not active" instead of claiming freshness.
- **Utilities.**
  - Contacts come from each utility's own website.
  - No utility checked publishes a machine-readable supply schedule, so the app says so. An adapter interface (`lib/utilities/feeds.ts`) is ready for one.
  - Complaints are drafts the farmer sends by phone or email. The app never claims submission.
- **Privacy.**
  - Location and farm details stay on the device.
  - Coordinates are rounded to about 100 m before leaving the phone, and to about 1 km before reaching the weather provider.

## API

All routes return `{ ok: true, data }` or `{ ok: false, error: { code, message, retryAfterSec? } }`.

| Route | Input | Notes |
| --- | --- | --- |
| `GET /api/weather` | `lat`, `lon` | 30-min server cache; stale copy marked `stale: true` |
| `GET /api/location/reverse` | `lat`, `lon` | Rejects non-Indian coordinates |
| `GET /api/location/search` | `state`, `district`, `place?` | Falls back to district level and says so |
| `GET /api/schemes` | `state?` | Adds `freshness`, `lastCheckedOk`, `sources` |
| `GET /api/utilities` | `state`, `district?` | Contacts plus `live` (null unless an adapter exists) |
| `POST /api/assistant` | `{ lang, messages[], location?, farm? }` | Max 12 messages of 1,200 characters each; body capped at 32 KB |
| `GET`/`POST /api/cron/refresh-schemes` | `Authorization: Bearer $CRON_SECRET` | 401 without secret; 503 without database |

Error codes map to HTTP statuses:

| Code | Status |
| --- | --- |
| `BAD_REQUEST` | 400 |
| `UNAUTHORIZED` | 401 |
| `NOT_FOUND` | 404 |
| `OUTSIDE_INDIA`, `CONTENT_BLOCKED` | 422 |
| `RATE_LIMITED` | 429 |
| `UPSTREAM_ERROR`, `INVALID_UPSTREAM_DATA` | 502 |
| `NOT_CONFIGURED` | 503 |
| `UPSTREAM_TIMEOUT` | 504 |

## Deploy (Vercel + PostgreSQL)

**Step by step, with what to check afterwards: `docs/DEPLOY_VERCEL.md`.** In short:

1. Optional, for scheme monitoring: create a PostgreSQL database (any provider), and set `DATABASE_URL` locally.
2. If you created one, run `npm run db:migrate`.
3. Import the repo in Vercel and set the environment variables for Production (at least `GEMINI_API_KEY` and `NOMINATIM_USER_AGENT`).
4. Deploy. `vercel.json` registers a daily cron (`30 0 * * *` UTC, which is 06:00 IST) that calls `/api/cron/refresh-schemes` with your `CRON_SECRET`. Cron runs only on production deployments.
5. Check: in the Vercel dashboard (Cron Jobs → Run), then on `/schemes` the labels should change from "check overdue" to "official page checked …".

**Other hosts:** `npm run build && npm start` behind HTTPS, and schedule `npm run schemes:refresh` daily with system cron or a GitHub Actions schedule.

**Production caveats:**
- Rate limits and caches are per server instance; use a shared store (e.g. Redis) at scale.
- The public Nominatim server allows about 1 request per second for your whole app, so use your own instance for real traffic.
- Commercial use of Open-Meteo needs a paid plan.
- Keep the OpenStreetMap and Open-Meteo attributions.

## Data files and GitHub

Raw datasets are too big for GitHub (100 MB per-file limit), so they stay on your computer and only the converted files are committed:

- `soil-dataset.csv` (1.18 GB) is **ignored** by `.gitignore` (`/*.csv`). Its converted form, `public/data/soil/` (26 MB, every file under 1 MB), **is committed**.
- To regenerate the converted files, put the raw file back and run `npm run soil:build` (see `docs/SOIL_DATA.md`).

## Project layout

```
app/          pages and API routes
components/   UI (client components only, no secrets)
lib/          all logic, framework-free and unit-tested
  crops/ cropcare/ schemes/ utilities/ assistant/ weather/ location/ server/ i18n/
db/migrations SQL schema       scripts/  migrate, scheme refresh
e2e/          Playwright tests  docs/     data-source register
public/       service worker (offline), icons, data/ (converted soil and crop datasets)
```
