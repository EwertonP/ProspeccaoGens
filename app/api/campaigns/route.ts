import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { deriveCampaignPlan, AiCredentialsError } from "@/lib/ai/campaign-brief";
import { createAndStartRun } from "@/lib/scrape-runs";

// GET /api/campaigns -- lista campanhas com contagem de leads, mais
// recentes primeiro (cards da tela /campaigns).
export async function GET() {
  const campaigns = await sql`
    select c.*, count(l.id)::int as lead_count
    from campaigns c
    left join leads l on l.campaign_id = c.id
    group by c.id
    order by c.created_at desc
  `;
  return NextResponse.json(campaigns);
}

// POST /api/campaigns -- recebe o briefing em 5 perguntas, usa a IA pra
// derivar nome/termos de busca/localização, cria a campanha e já dispara a
// coleta no Google Maps (createAndStartRun -- mesmo caminho assíncrono via
// webhook do Apify que a coleta manual usa).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productPitch, buyerPersona, problemSolved, locationQuery, existingCustomers } = body;

  if (!productPitch || !buyerPersona) {
    return NextResponse.json({ error: "productPitch e buyerPersona são obrigatórios" }, { status: 400 });
  }

  let plan;
  try {
    plan = await deriveCampaignPlan({ productPitch, buyerPersona, problemSolved, locationQuery, existingCustomers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao analisar o briefing com IA";
    return NextResponse.json({ error: message }, { status: err instanceof AiCredentialsError ? 501 : 502 });
  }

  const [campaign] = await sql`
    insert into campaigns (name, product_pitch, buyer_persona, problem_solved, location_query, existing_customers, search_terms)
    values (${plan.name}, ${productPitch}, ${buyerPersona}, ${problemSolved ?? null}, ${locationQuery ?? null}, ${existingCustomers ?? null}, ${plan.searchTerms})
    returning *
  `;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  try {
    const run = await createAndStartRun(
      {
        appUrl,
        searchStringsArray: plan.searchTerms,
        locationQuery: plan.locationQuery ?? undefined,
        countryCode: plan.locationQuery ? undefined : "BR",
      },
      campaign.id as string
    );
    return NextResponse.json({ campaign, run }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Campanha criada, mas falhou ao disparar a coleta";
    return NextResponse.json({ campaign, error: message }, { status: 207 });
  }
}
