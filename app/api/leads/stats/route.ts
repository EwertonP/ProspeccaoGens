import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/leads/stats?campaignId= -- contagem por status pras pills do
// topo do /leads, independente dos filtros aplicados na lista principal.
export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get("campaignId");

  const rows = await sql`
    select status, count(*)::int as count
    from leads
    where (${campaignId}::uuid is null or campaign_id = ${campaignId}::uuid)
    group by status
  `;

  const counts: Record<string, number> = { novo: 0, qualificado: 0, contatado: 0, descartado: 0, promovido: 0 };
  let total = 0;
  for (const row of rows) {
    counts[row.status as string] = row.count as number;
    total += row.count as number;
  }

  return NextResponse.json({ total, ...counts });
}
