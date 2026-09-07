import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// POST /api/leads/[id]/activities -- log manual de contato (ex: "marquei
// como contatado no WhatsApp"). channel/type vêm do body; body.body é
// opcional (nota livre). Usado pelos botões de outreach manual em
// /leads/[id].
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { channel, type, body } = await req.json();

  if (!channel || !type) return NextResponse.json({ error: "channel e type são obrigatórios" }, { status: 400 });

  const [activity] = await sql`
    insert into lead_activities (lead_id, channel, type, body)
    values (${id}, ${channel}, ${type}, ${body ?? null})
    returning *
  `;

  if (type === "mensagem_enviada" && ["whatsapp", "instagram"].includes(channel)) {
    await sql`update leads set status = 'contatado' where id = ${id} and status = 'novo'`;
  }

  return NextResponse.json(activity, { status: 201 });
}
