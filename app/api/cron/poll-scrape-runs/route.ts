import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRun } from "@/lib/apify";
import { ingestScrapeRun } from "@/lib/ingest";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

const STUCK_THRESHOLD_MINUTES = 15;

// GET /api/cron/poll-scrape-runs -- rede de segurança caso o webhook do
// Apify falhe em entregar. Vercel Cron (CRON_SECRET) chama isso
// periodicamente; qualquer scrape_run 'running' há mais de
// STUCK_THRESHOLD_MINUTES é consultada direto na API do Apify.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const threshold = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000).toISOString();

  const { data: stuckRuns, error } = await supabase
    .from("scrape_runs")
    .select("*")
    .eq("status", "running")
    .lt("started_at", threshold);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const results = [];
  for (const run of stuckRuns ?? []) {
    if (!run.apify_run_id) continue;
    try {
      const apifyRun = await getRun(run.apify_run_id);
      if (apifyRun?.status === "SUCCEEDED") {
        const result = await ingestScrapeRun(run.id);
        results.push({ id: run.id, action: "ingested", ...result });
      } else if (apifyRun?.status === "FAILED" || apifyRun?.status === "ABORTED" || apifyRun?.status === "TIMED-OUT") {
        await supabase
          .from("scrape_runs")
          .update({ status: "failed", finished_at: new Date().toISOString(), error_message: apifyRun.status })
          .eq("id", run.id);
        results.push({ id: run.id, action: "marked_failed", apifyStatus: apifyRun.status });
      } else {
        results.push({ id: run.id, action: "still_running" });
      }
    } catch (err) {
      results.push({ id: run.id, action: "check_failed", error: err instanceof Error ? err.message : "erro desconhecido" });
    }
  }

  return NextResponse.json({ checked: stuckRuns?.length ?? 0, results });
}
