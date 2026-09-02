import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/leads?status=novo&minScore=60&city=São Paulo -- lista filtrável
// pra tela /leads. Filtros são todos opcionais e combináveis.
export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = req.nextUrl;

  let query = supabase.from("leads").select("*").order("score", { ascending: false, nullsFirst: false });

  const status = searchParams.get("status");
  if (status) query = query.eq("status", status);

  const minScore = searchParams.get("minScore");
  if (minScore) query = query.gte("score", Number(minScore));

  const city = searchParams.get("city");
  if (city) query = query.ilike("city", `%${city}%`);

  const category = searchParams.get("category");
  if (category) query = query.ilike("category", `%${category}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
