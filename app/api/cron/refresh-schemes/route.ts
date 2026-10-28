import { fail, ok } from "@/lib/api/result";
import { SCHEMES } from "@/lib/schemes/data";
import { runRefresh } from "@/lib/schemes/refresh";
import { safeEqual } from "@/lib/server/config";
import { jsonResult } from "@/lib/server/http";
import { cronSecret, fetchPageText, schemeStore } from "@/lib/server/instances";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Daily scheme source check. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. */
async function handle(request: Request) {
  if (!cronSecret) return jsonResult(fail("NOT_CONFIGURED", "Set CRON_SECRET (16+ characters) to enable the refresh job"));
  const auth = request.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${cronSecret}`)) return jsonResult(fail("UNAUTHORIZED", "Bad or missing cron secret"));
  if (!schemeStore.persistent) {
    return jsonResult(fail("NOT_CONFIGURED", "Set DATABASE_URL and run `npm run db:migrate`; without a database, results cannot be kept"));
  }
  try {
    const report = await runRefresh({ registry: SCHEMES, store: schemeStore, fetchText: fetchPageText });
    return jsonResult(ok(report));
  } catch (err) {
    return jsonResult(fail("UPSTREAM_ERROR", `Refresh failed: ${String((err as Error)?.message ?? err).slice(0, 200)}`));
  }
}

export const GET = handle;
export const POST = handle;
