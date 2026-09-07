import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { enrichLeadFromWebsite } from "@/lib/enrichment";

// POST /api/leads/[id]/enrich -- busca e-mail/Instagram no site do lead
// (fetch leve, timeout curto, falha soft). Não sobrescreve valores já
// preenchidos manualmente.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [lead] = await sql`select id, website_url, email, instagram_handle from leads where id = ${id}`;
  if (!lead) return NextResponse.json({ error: "lead não encontrado" }, { status: 404 });
  if (!lead.website_url) return NextResponse.json({ error: "lead sem website_url -- nada pra enriquecer" }, { status: 400 });

  const result = await enrichLeadFromWebsite(lead.website_url as string);

  const [updated] = await sql`
    update leads set
      email = coalesce(${lead.email as string | null}, ${result.email}),
      instagram_handle = coalesce(${lead.instagram_handle as string | null}, ${result.instagramHandle}),
      enriched_at = now()
    where id = ${id}
    returning *
  `;

  return NextResponse.json(updated);
}
