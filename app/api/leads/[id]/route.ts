import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { LeadStatus } from "@/lib/types";

const VALID_STATUSES: LeadStatus[] = ["novo", "qualificado", "descartado", "contatado", "promovido"];

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

// PATCH /api/leads/[id] { status } -- muda o status manualmente, usado
// pelo 👍/👎 e pelo select inline da tabela em /leads. Promoção pro Notion
// continua sendo só via /api/leads/promote (não duplicar essa lógica aqui).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status inválido -- use um de: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  const [lead] = await sql`update leads set status = ${status}, updated_at = now() where id = ${id} returning *`;
  if (!lead) return NextResponse.json({ error: "lead não encontrado" }, { status: 404 });

  return NextResponse.json({ lead });
}
