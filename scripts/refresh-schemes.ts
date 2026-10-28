// Runs the scheme source check once, outside the web server (e.g. from system cron or GitHub Actions).
// Usage: DATABASE_URL=... npm run schemes:refresh
import { SCHEMES } from "../lib/schemes/data.ts";
import { runRefresh } from "../lib/schemes/refresh.ts";
import { getDatabaseUrl, getMonitorUserAgent } from "../lib/server/config.ts";
import { createFetchText } from "../lib/server/fetchText.ts";
import { createPgStore } from "../lib/server/pgStore.ts";

const url = getDatabaseUrl(process.env);
if (!url) {
  console.error("DATABASE_URL is not set (postgres://...)");
  process.exit(1);
}
const report = await runRefresh({
  registry: SCHEMES,
  store: createPgStore(url),
  fetchText: createFetchText({ userAgent: getMonitorUserAgent(process.env), timeoutMs: 15_000, maxBytes: 3_000_000 }),
});
console.log(JSON.stringify(report, null, 2));
process.exit(report.failed.length > 0 ? 2 : 0);
