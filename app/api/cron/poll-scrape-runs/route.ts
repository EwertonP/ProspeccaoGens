import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getRun } from "@/lib/apify";
import { ingestScrapeRun } from "@/lib/ingest";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

const STUCK_THRESHOLD_MINUTES = 15;

// GET /api/cron/poll-scrape-runs -- rede de segurança caso o webhook do
// Apify falhe em entregar. Vercel Cron (CRON_SECRET) chama isso 1x/dia
// (limite do plano Hobby); qualquer scrape_run 'running' há mais de
// STUCK_THRESHOLD_MINUTES é consultada direto na API do Apify.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const thresholdMs = STUCK_THRESHOLD_MINUTES * 60 * 1000;
  const stuckRuns = await sql`
    select * from scrape_runs where status = 'running' and started_at < now() - (${thresholdMs}::text || ' milliseconds')::interval
  `;

  const results = [];
  for (const run of stuckRuns) {
    if (!run.apify_run_id) continue;
    try {
      const apifyRun = await getRun(run.apify_run_id as string);
      if (apifyRun?.status === "SUCCEEDED") {
        const result = await ingestScrapeRun(run.id as string);
        results.push({ id: run.id, action: "ingested", ...result });
      } else if (apifyRun?.status === "FAILED" || apifyRun?.status === "ABORTED" || apifyRun?.status === "TIMED-OUT") {
        await sql`update scrape_runs set status = 'failed', finished_at = now(), error_message = ${apifyRun.status} where id = ${run.id}`;
        results.push({ id: run.id, action: "marked_failed", apifyStatus: apifyRun.status });
      } else {
        results.push({ id: run.id, action: "still_running" });
      }
    } catch (err) {
      results.push({ id: run.id, action: "check_failed", error: err instanceof Error ? err.message : "erro desconhecido" });
    }
  }

  return NextResponse.json({ checked: stuckRuns.length, results });
}
