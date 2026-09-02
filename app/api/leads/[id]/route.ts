import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/leads/[id] -- detalhe completo (lead + sinais + timeline) pra
// tela /leads/[id]: breakdown de score, auditoria de sinais, histórico de
// contato.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: lead, error: leadError }, { data: signals }, { data: activities }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).single(),
    supabase.from("lead_signals").select("*").eq("lead_id", id).order("signal_key"),
    supabase.from("lead_activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);

  if (leadError || !lead) return NextResponse.json({ error: leadError?.message ?? "lead não encontrado" }, { status: 404 });

  return NextResponse.json({ lead, signals: signals ?? [], activities: activities ?? [] });
}
