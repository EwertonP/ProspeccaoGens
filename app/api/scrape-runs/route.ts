import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { startGoogleMapsRun, ApifyCredentialsError } from "@/lib/apify";

// GET /api/scrape-runs -- histórico de runs (mais recentes primeiro).
export async function GET() {
  const runs = await sql`select * from scrape_runs order by created_at desc`;
  return NextResponse.json(runs);
}

// POST /api/scrape-runs -- dispara uma nova coleta no Google Maps.
// Retorna na hora (status='running') -- o resultado chega via webhook do
// Apify (apify-webhook/route.ts), nunca bloqueia esperando o run terminar.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { searchStringsArray, locationQuery, city, state, countryCode, maxCrawledPlacesPerSearch, maxReviews } = body;

  if (!Array.isArray(searchStringsArray) || searchStringsArray.length === 0) {
    return NextResponse.json({ error: "searchStringsArray é obrigatório (ex: ['clínica estética'])" }, { status: 400 });
  }
  if (!locationQuery && !city) {
    return NextResponse.json({ error: "informe locationQuery ou city" }, { status: 400 });
  }

  const [run] = await sql`
    insert into scrape_runs (source, status, search_params)
    values ('google_maps', 'queued', ${JSON.stringify(body)})
    returning *
  `;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const webhookUrl = `${appUrl}/api/scrape-runs/apify-webhook?secret=${process.env.APIFY_WEBHOOK_SECRET ?? ""}`;

  try {
    const { apifyRunId, datasetId } = await startGoogleMapsRun(
      { searchStringsArray, locationQuery, city, state, countryCode, maxCrawledPlacesPerSearch, maxReviews },
      webhookUrl
    );

    const [updatedRun] = await sql`
      update scrape_runs set status = 'running', apify_run_id = ${apifyRunId}, apify_dataset_id = ${datasetId}, started_at = now()
      where id = ${run.id}
      returning *
    `;

    return NextResponse.json(updatedRun, { status: 201 });
  } catch (err) {
    const message = err instanceof ApifyCredentialsError ? err.message : "Falha ao disparar o run no Apify";
    await sql`update scrape_runs set status = 'failed', error_message = ${message} where id = ${run.id}`;
    return NextResponse.json({ error: message }, { status: err instanceof ApifyCredentialsError ? 501 : 502 });
  }
}
