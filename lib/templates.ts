import type { Lead } from "./types";

// Placeholders simples ({{name}}, {{company}}, {{category}}) -- suficiente
// pro v1, sem motor de template mais esperto. `company` e `name` são o
// mesmo campo aqui (leads.name), mantido separado só pra bater com o
// vocabulário usado no restante do domínio.
export function renderTemplate(body: string, lead: Pick<Lead, "name" | "category" | "city">): string {
  return body
    .replaceAll("{{name}}", lead.name)
    .replaceAll("{{company}}", lead.name)
    .replaceAll("{{category}}", lead.category ?? "seu segmento")
    .replaceAll("{{city}}", lead.city ?? "sua cidade");
}

// Default usado quando ainda não existe um message_template cadastrado
// (channel='whatsapp') no banco -- o time pode sobrescrever isso a
// qualquer momento na tela de /settings.
export const DEFAULT_WHATSAPP_TEMPLATE =
  "Oi! Vi o perfil de vocês ({{company}}) e queria entender melhor como está a presença de vocês " +
  "hoje online. Faz sentido uma conversa rápida essa semana?";

export const DEFAULT_INSTAGRAM_TEMPLATE = DEFAULT_WHATSAPP_TEMPLATE;
