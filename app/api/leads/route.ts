import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/leads?status=novo&minScore=60&city=São Paulo -- lista filtrável
// pra tela /leads. Filtros são todos opcionais e combináveis.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const minScore = searchParams.get("minScore");
  const city = searchParams.get("city");
  const category = searchParams.get("category");

  const leads = await sql`
    select * from leads
    where (${status}::text is null or status = ${status})
      and (${minScore}::text is null or score >= ${minScore}::int)
      and (${city}::text is null or city ilike ${city ? `%${city}%` : null})
      and (${category}::text is null or category ilike ${category ? `%${category}%` : null})
    order by score desc nulls last
  `;
  return NextResponse.json(leads);
}
