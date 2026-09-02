import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startGoogleMapsRun, ApifyCredentialsError } from "@/lib/apify";

// GET /api/scrape-runs -- histórico de runs (mais recentes primeiro).
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("scrape_runs").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
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

  const supabase = createAdminClient();

  const { data: run, error: insertError } = await supabase
    .from("scrape_runs")
    .insert({
      source: "google_maps",
      status: "queued",
      search_params: body,
    })
    .select()
    .single();
  if (insertError || !run) return NextResponse.json({ error: insertError?.message }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const webhookUrl = `${appUrl}/api/scrape-runs/apify-webhook?secret=${process.env.APIFY_WEBHOOK_SECRET ?? ""}`;

  try {
    const { apifyRunId, datasetId } = await startGoogleMapsRun(
      { searchStringsArray, locationQuery, city, state, countryCode, maxCrawledPlacesPerSearch, maxReviews },
      webhookUrl
    );

    const { data: updatedRun, error: updateError } = await supabase
      .from("scrape_runs")
      .update({ status: "running", apify_run_id: apifyRunId, apify_dataset_id: datasetId, started_at: new Date().toISOString() })
      .eq("id", run.id)
      .select()
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

    return NextResponse.json(updatedRun, { status: 201 });
  } catch (err) {
    const message = err instanceof ApifyCredentialsError ? err.message : "Falha ao disparar o run no Apify";
    await supabase.from("scrape_runs").update({ status: "failed", error_message: message }).eq("id", run.id);
    return NextResponse.json({ error: message }, { status: err instanceof ApifyCredentialsError ? 501 : 502 });
  }
}
