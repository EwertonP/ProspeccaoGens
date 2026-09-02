import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { generateUnsubscribeToken } from "@/lib/unsubscribe";
import { touchNotionLeadAfterEmail } from "@/lib/notion-bridge/promote";
import { renderTemplate } from "@/lib/templates";
import type { Lead } from "@/lib/types";

const AGENCY_NAME = process.env.NEXT_PUBLIC_AGENCY_NAME ?? "Agência";
const SCHEDULING_LINK = process.env.NEXT_PUBLIC_SCHEDULING_LINK;

function buildEmailHtml(lead: Pick<Lead, "id" | "name" | "category" | "city">, bodyHtml: string, appUrl: string) {
  const token = generateUnsubscribeToken(lead.id);
  const unsubscribeUrl = `${appUrl}/api/outreach/email/unsubscribe?lead_id=${lead.id}&token=${token}`;
  const cta = SCHEDULING_LINK
    ? `<p><a href="${SCHEDULING_LINK}">Agendar uma conversa rápida</a></p>`
    : "";

  return `
    <div>
      ${bodyHtml}
      ${cta}
      <hr />
      <p style="font-size:12px;color:#666">
        Você recebeu este e-mail porque identificamos ${lead.name} como um contato relevante pra ${AGENCY_NAME}.
        Se não quiser mais receber esse tipo de mensagem, <a href="${unsubscribeUrl}">clique aqui pra sair da lista</a>.
      </p>
    </div>
  `;
}

// POST /api/outreach/email { leadId, subject, bodyHtml } -- envio único
// (v1, sem sequência multi-touch). Bloqueia se email_opt_out=true. Se o
// lead já foi promovido pro Notion, também atualiza a página lá (senão o
// envio fica invisível pra quem só olha o Kanban).
export async function POST(req: NextRequest) {
  const { leadId, subject, bodyHtml } = await req.json();
  if (!leadId || !subject || !bodyHtml) {
    return NextResponse.json({ error: "leadId, subject e bodyHtml são obrigatórios" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: lead, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (error || !lead) return NextResponse.json({ error: error?.message ?? "lead não encontrado" }, { status: 404 });

  const typedLead = lead as Lead;
  if (typedLead.email_opt_out) {
    return NextResponse.json({ error: "lead está na lista de descadastro (email_opt_out)" }, { status: 409 });
  }
  if (!typedLead.email) {
    return NextResponse.json({ error: "lead sem e-mail cadastrado" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const renderedSubject = renderTemplate(subject, typedLead);
  const renderedBody = renderTemplate(bodyHtml, typedLead);
  const html = buildEmailHtml(typedLead, renderedBody, appUrl);

  const result = await sendEmail({ to: typedLead.email, subject: renderedSubject, html });

  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    channel: "email",
    type: result.sent ? "mensagem_enviada" : "erro_envio",
    body: renderedSubject,
    email_id: result.id ?? null,
  });

  if (result.sent && typedLead.promoted_notion_page_id) {
    await touchNotionLeadAfterEmail(typedLead.promoted_notion_page_id, `E-mail automatizado enviado: "${renderedSubject}"`);
  }

  if (!result.sent) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ sent: true, id: result.id });
}
