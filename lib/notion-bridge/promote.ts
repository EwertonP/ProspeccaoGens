import { getNotionClient, getLeadsDatabaseId } from "./client";
import { toWhatsAppLink } from "../whatsapp";
import { renderTemplate, DEFAULT_WHATSAPP_TEMPLATE } from "../templates";
import type { Lead } from "../types";

// Tri-state Sim/Não/Não verificável -- nunca vira checkbox binário no
// Notion, senão perde a distinção "não sabemos" que o schema de
// lead_signals preserva no Supabase. `value` já vem resolvido pelo caller
// (undefined = sinal nem foi calculado ainda, null = sinal calculado como
// 'nao_verificavel').
function triStateSelect(value: boolean | null | undefined): { select: { name: string } } {
  if (value === true) return { select: { name: "Sim" } };
  if (value === false) return { select: { name: "Não" } };
  return { select: { name: "Não verificável" } };
}

function richText(content: string | null | undefined) {
  return { rich_text: content ? [{ text: { content } }] : [] };
}

function urlProp(url: string | null | undefined) {
  return { url: url ?? null };
}

export interface PromoteLeadInput {
  lead: Lead;
  signals: { has_website: boolean | null; runs_paid_ads: boolean | null; posts_regularly: boolean | null };
  appBaseUrl: string;
}

export interface PromoteLeadResult {
  pageId: string;
  alreadyPromoted: boolean;
}

// Idempotente do lado do chamador: a rota que chama isso (app/api/leads/promote)
// deve checar lead.promoted_notion_page_id ANTES de chamar esta função, e
// persistir o page.id retornado logo depois -- esta função em si só cria.
export async function promoteLeadToNotion({ lead, signals, appBaseUrl }: PromoteLeadInput): Promise<PromoteLeadResult> {
  if (lead.promoted_notion_page_id) {
    return { pageId: lead.promoted_notion_page_id, alreadyPromoted: true };
  }

  const notion = getNotionClient();
  const databaseId = getLeadsDatabaseId();

  const whatsappMessage = renderTemplate(DEFAULT_WHATSAPP_TEMPLATE, lead);
  const whatsappLink = toWhatsAppLink(lead.whatsapp_phone ?? lead.phone, whatsappMessage);
  const instagramLink = lead.instagram_handle ? `https://instagram.com/${lead.instagram_handle}` : null;

  const originOption =
    lead.source === "google_maps" ? "🗺️ Google Maps" : lead.source === "instagram" ? "📸 Instagram" : "💼 LinkedIn";

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      "Negócio": { title: [{ text: { content: lead.name } }] },
      "Etapa": { select: { name: "🆕 Qualificado" } },
      "Origem": { select: { name: originOption } },
      "Categoria": richText(lead.category),
      "Cidade": richText(lead.city),
      "Score": { number: lead.score ?? null },
      "Tem Site": { checkbox: signals.has_website === true },
      "Roda Tráfego Pago": triStateSelect(signals.runs_paid_ads),
      "Posta Regularmente": triStateSelect(signals.posts_regularly),
      "Avaliação Google": { number: lead.google_rating ?? null },
      "Telefone": { phone_number: lead.phone ?? null },
      "WhatsApp": urlProp(whatsappLink),
      "Instagram": urlProp(instagramLink),
      "Website": urlProp(lead.website_url),
      "Link Google Maps": urlProp(lead.google_maps_url),
      "Notas Internas": richText(
        lead.instagram_handle && !instagramLink
          ? "Sem link direto de Instagram -- copiar a mensagem abaixo pra colar na DM."
          : `Mensagem sugerida:\n${whatsappMessage}`
      ),
      "Link no App": urlProp(`${appBaseUrl}/leads/${lead.id}`),
      "ID do Lead (App)": richText(lead.id),
    },
  });

  return { pageId: page.id, alreadyPromoted: false };
}

// Atualiza a página do Notion depois de um contato automatizado (e-mail)
// pra ela não ficar invisível pra quem só olha o Notion. Falha soft --
// nunca derruba o fluxo de envio de e-mail por causa disso.
export async function touchNotionLeadAfterEmail(pageId: string, note: string): Promise<void> {
  try {
    const notion = getNotionClient();
    await notion.pages.update({
      page_id: pageId,
      properties: {
        "Data do Último Contato": { date: { start: new Date().toISOString().slice(0, 10) } },
        "Notas Internas": richText(note),
      },
    });
  } catch (err) {
    console.error("[notion-bridge] falha ao atualizar página após e-mail:", err);
  }
}
