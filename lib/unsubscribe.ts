import { createHmac, timingSafeEqual } from "crypto";

// Token HMAC pro link de descadastro do rodapé LGPD -- evita enumeração
// (não dá pra adivinhar o token de outro lead_id só olhando a URL).
function getSecret(): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("EMAIL_UNSUBSCRIBE_SECRET não configurada");
  return secret;
}

export function generateUnsubscribeToken(leadId: string): string {
  return createHmac("sha256", getSecret()).update(leadId).digest("hex");
}

export function verifyUnsubscribeToken(leadId: string, token: string): boolean {
  try {
    const expected = Buffer.from(generateUnsubscribeToken(leadId), "hex");
    const provided = Buffer.from(token, "hex");
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}
