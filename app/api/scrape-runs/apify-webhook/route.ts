import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestScrapeRun } from "@/lib/ingest";

// POST /api/scrape-runs/apify-webhook?secret=... -- chamado pelo Apify
// quando um run de scrape termina (ACTOR.RUN.SUCCEEDED/FAILED/ABORTED/
// TIMED_OUT). Autenticado por secret compartilhado na query string
// (APIFY_WEBHOOK_SECRET), não por CRON_SECRET -- é o próprio Apify chamando,
// não um cron nosso.
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.APIFY_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const apifyRunId: string | undefined = payload?.resource?.id ?? payload?.eventData?.actorRunId;
  const eventType: string | undefined = payload?.eventType;

  if (!apifyRunId) return NextResponse.json({ error: "payload sem id de run" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: run } = await supabase.from("scrape_runs").select("*").eq("apify_run_id", apifyRunId).maybeSingle();
  if (!run) return NextResponse.json({ error: "scrape_run não encontrada para esse apify_run_id" }, { status: 404 });

  if (eventType && eventType !== "ACTOR.RUN.SUCCEEDED") {
    await supabase
      .from("scrape_runs")
      .update({ status: eventType.includes("FAILED") ? "failed" : "partial", finished_at: new Date().toISOString(), error_message: eventType })
      .eq("id", run.id);
    return NextResponse.json({ ok: true, skipped: eventType });
  }

  try {
    const result = await ingestScrapeRun(run.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    await supabase.from("scrape_runs").update({ status: "failed", error_message: message }).eq("id", run.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
