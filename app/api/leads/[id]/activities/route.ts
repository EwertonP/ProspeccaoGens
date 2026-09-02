import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/leads/[id]/activities -- log manual de contato (ex: "marquei
// como contatado no WhatsApp"). channel/type vêm do body; body.body é
// opcional (nota livre). Usado pelos botões de outreach manual em
// /leads/[id].
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await req.json();
  const { channel, type, body } = payload;

  if (!channel || !type) return NextResponse.json({ error: "channel e type são obrigatórios" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: activity, error } = await supabase
    .from("lead_activities")
    .insert({ lead_id: id, channel, type, body: body ?? null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (type === "mensagem_enviada" && ["whatsapp", "instagram"].includes(channel)) {
    await supabase.from("leads").update({ status: "contatado" }).eq("id", id).eq("status", "novo");
  }

  return NextResponse.json(activity, { status: 201 });
}
