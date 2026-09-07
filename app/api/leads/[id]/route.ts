import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/leads/[id] -- detalhe completo (lead + sinais + timeline) pra
// tela /leads/[id]: breakdown de score, auditoria de sinais, histórico de
// contato.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [[lead], signals, activities] = await Promise.all([
    sql`select * from leads where id = ${id}`,
    sql`select * from lead_signals where lead_id = ${id} order by signal_key`,
    sql`select * from lead_activities where lead_id = ${id} order by created_at desc`,
  ]);

  if (!lead) return NextResponse.json({ error: "lead não encontrado" }, { status: 404 });

  return NextResponse.json({ lead, signals, activities });
}
