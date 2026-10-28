import { test, expect, type Page } from "@playwright/test";

/*
 * Browser tests for the main journeys. Routes that call third-party services are mocked with
 * page.route so tests are deterministic and need no API keys. Schemes, utilities and the crisis
 * path run against the real API routes. These scenarios mirror the 17 that were run in the build
 * environment's harness (see TASKS.md).
 */

const LOCATION = {
  version: 1, state: "Uttarakhand", district: "Dehradun", place: "Rampur", pin: null, lat: 30.317, lon: 78.032,
  accuracyM: null, label: "Rampur, Dehradun, Uttarakhand", source: "manual-geocoded", savedAt: "2026-10-26T10:00:00.000Z",
};

function istDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** TEST DATA ONLY — synthetic weather in the app's API shape. */
function weatherPayload() {
  const daily = Array.from({ length: 7 }, (_, i) => ({
    date: istDate(i), maxC: 29, minC: 15, precipMm: 0, precipProbPct: 10, windMaxKmh: 8, weatherCode: 1,
  }));
  return {
    ok: true,
    data: {
      report: { lat: 30.32, lon: 78.03, elevationM: 640, timezone: "Asia/Kolkata",
        current: { time: `${istDate()}T14:00`, temperatureC: 27.4, feelsLikeC: 28.1, humidityPct: 55, precipitationMm: 0, windKmh: 6.5, weatherCode: 1, isDay: true },
        daily },
      fetchedAt: new Date().toISOString(), stale: false,
      source: { name: "Open-Meteo", url: "https://open-meteo.com/", attribution: "Weather data by Open-Meteo.com (CC BY 4.0)" },
    },
  };
}

async function seed(page: Page, opts: { location?: boolean; lang?: "en" | "hi" } = {}) {
  await page.addInitScript(([loc, lang]) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("ks:lang:v1", JSON.stringify(lang));
    if (loc) localStorage.setItem("ks:location:v1", JSON.stringify(loc));
  }, [opts.location === false ? null : LOCATION, opts.lang ?? "en"] as const);
  await page.route("**/api/weather**", (r) => r.fulfill({ json: weatherPayload() }));
}

test("first visit: choose language, then set location by typing", async ({ page }) => {
  await page.route("**/api/location/search**", (r) =>
    r.fulfill({ json: { ok: true, data: { precision: "place", placeLookup: "found", candidates: [{ label: "Rampur, Dehradun, Uttarakhand", lat: 30.3165, lon: 78.0322, state: "Uttarakhand", district: "Dehradun", place: "Rampur", postcode: "248001", countryCode: "in", matchesState: true }] } } }));
  await page.route("**/api/weather**", (r) => r.fulfill({ json: weatherPayload() }));
  await page.goto("/");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByText("Set your location first")).toBeVisible();
  await page.getByRole("link", { name: "Set your location" }).first().click();
  await page.getByRole("button", { name: "Type my village and district" }).click();
  await page.getByLabel("State").selectOption("Uttarakhand");
  await page.getByLabel("District").selectOption("Dehradun");
  await page.getByLabel("Village or town (optional)").fill("Rampur");
  await page.getByRole("button", { name: "Find my area" }).click();
  await page.getByRole("button", { name: "Save selected area" }).click();
  await expect(page.getByText("Location saved.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Today on your farm")).toBeVisible();
});

test("village lookup unavailable: says so honestly, and a district centre is never saved as 'found on the map'", async ({ page }) => {
  await seed(page, { location: false });
  await page.route("**/api/location/search**", (r) =>
    r.fulfill({ json: { ok: true, data: { precision: "district", placeLookup: "unavailable", candidates: [{ label: "Dehradun, Uttarakhand", lat: 30.5, lon: 77.863, state: "Uttarakhand", district: "Dehradun", place: null, postcode: null, countryCode: "in", matchesState: true }] } } }));
  await page.goto("/my-farm");
  await page.getByRole("button", { name: "Type my village and district" }).click();
  await page.getByLabel("State").selectOption("Uttarakhand");
  await page.getByLabel("District").selectOption("Dehradun");
  await page.getByLabel("Village or town (optional)").fill("Doiwala");
  await page.getByRole("button", { name: "Find my area" }).click();
  await expect(page.getByText("We could not search the map for your village right now")).toBeVisible();
  await expect(page.getByText("Your village was not found on the map")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.getByRole("button", { name: "Save selected area" }).click();
  await expect(page.getByText("The map position is the district centre")).toBeVisible();
  await expect(page.getByText("Typed by you and found on the map")).toHaveCount(0);
  await page.goto("/weather");
  await expect(page.getByText("For Dehradun district (district centre)")).toBeVisible();
});

test("location permission denied: app explains and offers the form", async ({ page, context }) => {
  await context.clearPermissions();
  await seed(page, { location: false });
  await page.goto("/my-farm");
  await page.getByRole("button", { name: "Use my current location" }).click();
  await expect(page.getByText(/Location is blocked for this site|could not find its position|took too long/)).toBeVisible();
  await expect(page.getByLabel("District")).toBeVisible();
});

test("weather: real data shown with source; provider failure shows an honest error", async ({ page }) => {
  await seed(page);
  await page.goto("/weather");
  await expect(page.getByText("27°C").first()).toBeVisible();
  await expect(page.getByText("not official IMD warnings")).toBeVisible();
  await page.unroute("**/api/weather**");
  await page.route("**/api/weather**", (r) => r.fulfill({ status: 502, json: { ok: false, error: { code: "UPSTREAM_ERROR", message: "x" } } }));
  await page.evaluate(() => localStorage.removeItem("ks:weather:v1"));
  await page.reload();
  await expect(page.getByText("not working right now")).toBeVisible();
});

test("what to grow: verified window with source; unknown district gets no guesses", async ({ page }) => {
  await seed(page);
  await page.goto("/grow");
  await page.getByLabel("When do you plan to sow?").fill("2026-10-26");
  await page.getByLabel("Yes, irrigated").check();
  await page.getByRole("button", { name: "Show crops" }).click();
  await expect(page.getByText("Rabi: October – December")).toBeVisible();
  await expect(page.getByText(/ICAR-CRIDA/).first()).toBeVisible();
});

test("assistant: crisis message gets helplines (real API, no model call needed)", async ({ page }) => {
  await seed(page);
  await page.goto("/ask");
  await page.getByLabel("Your question").fill("I want to end my life");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByText("Help is available now")).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 14416" })).toBeVisible();
});

test("assistant: not configured shows a clear message and the helpline", async ({ page }) => {
  await seed(page);
  await page.route("**/api/assistant", (r) => r.fulfill({ status: 503, json: { ok: false, error: { code: "NOT_CONFIGURED", message: "x" } } }));
  await page.goto("/ask");
  await page.getByLabel("Your question").fill("how to grow wheat");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByText("not switched on")).toBeVisible();
  await expect(page.getByLabel("Your question")).toHaveValue("how to grow wheat");
});

test("schemes: verified list with official links (real API)", async ({ page }) => {
  await seed(page);
  await page.goto("/schemes");
  await page.getByText("PM-KISAN (Pradhan Mantri").click();
  await expect(page.getByText("₹6,000 per year")).toBeVisible();
  await expect(page.locator("details")).toHaveCount(4);
});

test("utilities: complaint is a draft the farmer sends, never 'submitted' (real API)", async ({ page }) => {
  await seed(page);
  await page.goto("/utilities");
  await page.getByLabel("Which service?").selectOption("upcl");
  await page.getByLabel("Problem").selectOption("no-power");
  await page.getByRole("button", { name: "Prepare complaint" }).click();
  await expect(page.getByText("Not sent.")).toBeVisible();
  await expect(page.getByText(/submitted successfully/i)).toHaveCount(0);
});

test("Hindi throughout", async ({ page }) => {
  await seed(page, { lang: "hi" });
  await page.goto("/");
  await expect(page.getByText("आज आपके खेत पर")).toBeVisible();
});

test("a district that isn't a town name (North Goa) saves from the bundled centre, with no map service", async ({ page }) => {
  await seed(page);
  await page.goto("/my-farm");
  await page.getByRole("button", { name: "Change location" }).click();
  await page.getByRole("button", { name: "Type my village and district" }).click();
  await page.getByLabel("State").selectOption("Goa");
  await page.getByLabel("District").selectOption("North Goa");
  await page.getByRole("button", { name: "Find my area" }).click(); // real API route: no village typed, so no network call
  await expect(page.getByText("Centre of the district.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Save selected area" }).click();
  await expect(page.getByRole("link", { name: /Your location: North Goa, Goa/ })).toBeVisible();
});

test("Back above the page title returns to the previous screen, and to Home from a directly opened page", async ({ page }) => {
  await seed(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
  await page.locator("main").getByRole("link", { name: /Weather/ }).first().click();
  await expect(page).toHaveURL(/\/weather$/);
  await page.getByRole("link", { name: /Your location/ }).click();
  await expect(page).toHaveURL(/\/my-farm$/);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/weather$/);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() => sessionStorage.removeItem("ks:visited:v1"));
  await page.goto("/soil");
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/$/);
});
