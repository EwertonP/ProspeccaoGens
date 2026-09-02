import { parsePhoneNumberFromString } from "libphonenumber-js";

// Normaliza um telefone (formato livre, como vem do Google Maps) pra E.164
// assumindo Brasil como país padrão, e monta o link wa.me com a mensagem
// já preenchida. Retorna null se o número não for válido -- nunca lança,
// pra não derrubar a promoção de um lead por causa de um telefone malformado.
export function toWhatsAppLink(rawPhone: string | null | undefined, message: string): string | null {
  if (!rawPhone) return null;
  const parsed = parsePhoneNumberFromString(rawPhone, "BR");
  if (!parsed || !parsed.isValid()) return null;

  const e164Digits = parsed.number.replace("+", "");
  return `https://wa.me/${e164Digits}?text=${encodeURIComponent(message)}`;
}

export function normalizeE164(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null;
  const parsed = parsePhoneNumberFromString(rawPhone, "BR");
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}
