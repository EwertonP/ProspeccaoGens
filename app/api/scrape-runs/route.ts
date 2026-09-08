import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { createAndStartRun } from "@/lib/scrape-runs";

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  try {
    const run = await createAndStartRun({
      appUrl,
      searchStringsArray,
      locationQuery,
      city,
      state,
      countryCode,
      maxCrawledPlacesPerSearch,
      maxReviews,
    });
    return NextResponse.json(run, { status: 201 });
  } catch (err) {
    const isCredentialsError = (err as { isCredentialsError?: boolean })?.isCredentialsError;
    const message = err instanceof Error ? err.message : "Falha ao disparar o run no Apify";
    return NextResponse.json({ error: message }, { status: isCredentialsError ? 501 : 502 });
  }
}
