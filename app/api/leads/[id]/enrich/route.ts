import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichLeadFromWebsite } from "@/lib/enrichment";

// POST /api/leads/[id]/enrich -- busca e-mail/Instagram no site do lead
// (fetch leve, timeout curto, falha soft). Não sobrescreve valores já
// preenchidos manualmente.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: lead, error } = await supabase.from("leads").select("id, website_url, email, instagram_handle").eq("id", id).single();
  if (error || !lead) return NextResponse.json({ error: error?.message ?? "lead não encontrado" }, { status: 404 });
  if (!lead.website_url) return NextResponse.json({ error: "lead sem website_url -- nada pra enriquecer" }, { status: 400 });

  const result = await enrichLeadFromWebsite(lead.website_url);

  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update({
      email: lead.email ?? result.email,
      instagram_handle: lead.instagram_handle ?? result.instagramHandle,
      enriched_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  return NextResponse.json(updated);
}
