import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
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

  const [run] = await sql`select * from scrape_runs where apify_run_id = ${apifyRunId}`;
  if (!run) return NextResponse.json({ error: "scrape_run não encontrada para esse apify_run_id" }, { status: 404 });

  if (eventType && eventType !== "ACTOR.RUN.SUCCEEDED") {
    const status = eventType.includes("FAILED") ? "failed" : "partial";
    await sql`update scrape_runs set status = ${status}, finished_at = now(), error_message = ${eventType} where id = ${run.id}`;
    return NextResponse.json({ ok: true, skipped: eventType });
  }

  try {
    const result = await ingestScrapeRun(run.id as string);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    await sql`update scrape_runs set status = 'failed', error_message = ${message} where id = ${run.id}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
