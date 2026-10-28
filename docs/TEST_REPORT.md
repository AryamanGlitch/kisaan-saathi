# Test report — Kisaan Saathi

_27 Oct 2026. Build environment: Node 22, Chromium (Playwright), no internet for code._

## Results

| Suite | What it covers | Result |
| --- | --- | --- |
| Unit tests (`npm test`) | All logic: crop engine, soil ratings at official boundaries, CSV import, weather and soil parsing, assistant safety guards, Gemini error mapping, scheme refresh, config | **116/116** |
| Strict typecheck | `lib/`, `scripts/`, and UI against stubs | **0 errors** |
| Server routes (real Next.js handlers, third-party services faked) | weather + refresh, soil, place search, schemes, utilities, assistant (validation, rate limit, dose removal, citation filtering, rejected key), cron auth | **all as designed** |
| Regression scenarios (single-file app opened from disk, mobile size) | 17 user journeys incl. GPS allowed/denied, offline, provider down, crisis routing, soil, CSV import, preview detection, Hindi | **17/17** |
| Exploratory tests (×3 runs) | 16 new edge cases, listed below | **16/16 on each of 3 consecutive runs** |
| Check-the-app page | all OK; every service down; no key; GPS allowed; GPS blocked | **5/5** |
| Button audit | every button, link and expandable item on every page, before and after each page's main action | **97/97, 0 problems** |

## Exploratory tests (new this round)

| Test | Result |
| --- | --- |
| Low-end phone (CPU slowed 6×) | First screen ≈ 2.7 s; opening Weather ≈ 0.6 s |
| Keyboard only | All controls reachable with Tab, focus always visible, Enter opens links |
| Accessibility basics on all pages | Every button, link and field has a name or label; one h1 per page; no duplicate ids; icons hidden from screen readers; `lang` attribute follows the language |
| Slow weather service (4 s) | Loading message, then data |
| Fast page switching while requests are pending | No errors |
| Double-tap on Ask | One question sent |
| Location typed in Hindi (देहरादून / रामपुर) | Searched and saved correctly |
| Assistant server error, unreadable reply, rejected key | Clear messages; the typed question is kept |
| Sowing dates across the year end (20 Dec, 5 Jan) | Correct |
| Severe forecast (80 mm rain + 42 °C) | Heavy rain ranked first, heat also shown |
| Reload | Language, location, farm details, soil card and drafts all survive |
| Phone Back button | Works |
| 700-character text | Capped at 600 |
| Large phone font (150%) | No sideways scrolling on any page |
| Browser storage full or blocked | App keeps working and says plainly that data won't be kept |

## Bugs found and fixed this round

1. **Storage full or blocked** (private mode, some in-app browsers):
   - **Before:** the app said "Location saved" (not true after closing) and showed a misleading "preview" banner.
   - **Now:** it shows "This browser is not saving your information…" and "Location set for this visit only". The preview banner appears only for real embedded previews.
2. **Rejected Gemini key:**
   - **Before:** "not set up, add your key" appeared even though a key was saved.
   - **Now:** "Google did not accept the API key…" appears, with the replace-key form next to it.

## Test-harness problems found and fixed (not app bugs)

- An unreliable setup script occasionally overwrote the saved language during reload. Proved by instrumenting every write: the app's own write was always correct. The script now seeds data through the page itself.
- A comment placed on the same line commented out one test step.
- Hindi month spelling differs between Node and Chromium (both valid). The test accepts either.

## Not testable here, so now testable by you

Live calls to Open-Meteo, place search and Gemini, and real GPS on a phone, can't run from this environment. The app now has a **Check the app** page (link at the bottom of every page). It runs those checks for real on your phone and lets you copy a report:

- secure address (https)
- not inside a preview
- data saving works
- internet
- weather
- soil moisture
- place search
- location permission and a live GPS test
- the assistant with your key

Run it after publishing (`docs/PUBLISH_WEBSITE.md`) and send me the copied report.

## Follow-up: "That doesn't look like a key" (27 Oct 2026)

- **Cause (app bug):** since June 2026, Google AI Studio issues auth keys that start with `AQ.` and contain dots. The app's paste check only allowed the older `AIza…` character set, so it rejected valid keys.
- **Fixes:**
  - **New formats accepted.** Pasted text is also cleaned of spaces, line breaks, invisible characters, quotes and `GEMINI_API_KEY=` prefixes.
  - **Key tested with Google on save:**
    - "Key works (model …)"
    - "Google did not accept this key"
    - "saved, couldn't check now"
  - **Old `AIza` keys** get an explanation, since Google rejects them from September 2026.
  - **Model fallback:** if `gemini-3.5-flash` is retired, the app tries `gemini-3.8-flash`, then `gemini-3.6-flash`. These model names are taken from Google's examples.
- **Tests:**

  | Suite | Result |
  | --- | --- |
  | New unit tests (key cleaning, model fallback) | pass |
  | Key scenarios in Chromium | 7/7 |
  | Regression scenarios | 17/17 |
  | Exploratory tests | 16/16 |
  | Button audit | 98/98 |
  | Unit tests overall | 120/120 |

- **Fixed in the tests (not the app):**
  - one test depended on the time of day (a synthetic soil value)
  - two expected the old "Assistant is on" text

## Follow-up: "Use my current location" (27 Oct 2026)

**Changes:**
- **Area names found automatically** after GPS in the single-file version (OpenStreetMap Nominatim, cached).
- **A specific message for each failure**, checked before asking:
  - not https
  - inside a preview
  - site blocked, with steps to unblock
  - phone Location off
  - timeout
- **Automatic retry** with high-accuracy GPS (25 s) when the quick fix fails indoors.
- **Accuracy shown in metres** when under 1 km. A 35 m fix used to read "about 1 km".

**Tests:**

| Suite | Result |
| --- | --- |
| Location scenarios in Chromium | 9/9 |
| Regression scenarios | 17/17 |
| Exploratory tests | 16/16 |
| Key tests | 7/7 |
| Check page | 5/5 |
| Button audit | 98/98 |
| Unit tests | 120/120 |

**Not tested here:** a real phone's GPS. Use Check the app → Test my location now.
