// Enriquecimento leve: um único GET (timeout curto, sem seguir links) na
// home do site do lead, extraindo e-mail e handle do Instagram linkados.
// Falha sempre soft -- nunca derruba o lote de promoção/scoring por causa
// de um site fora do ar.

const FETCH_TIMEOUT_MS = 8000;

// Domínios de terceiros que aparecem como "e-mail de contato" por engano
// (scripts de analytics/erro embutidos no HTML, não é o e-mail do negócio).
const EMAIL_FALSE_POSITIVE_DOMAINS = ["sentry.io", "wixpress.com", "sentry-next.wixpress.com", "example.com"];

export interface EnrichmentResult {
  email: string | null;
  instagramHandle: string | null;
}

function extractFirstEmail(html: string): string | null {
  const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  const valid = matches.find((email) => !EMAIL_FALSE_POSITIVE_DOMAINS.some((domain) => email.endsWith(domain)));
  return valid?.toLowerCase() ?? null;
}

function extractInstagramHandle(html: string): string | null {
  const match = html.match(/instagram\.com\/([a-zA-Z0-9_.]{2,30})/);
  if (!match) return null;
  const handle = match[1].replace(/\/$/, "");
  if (["p", "reel", "explore", "accounts", "share"].includes(handle)) return null;
  return handle;
}

export async function enrichLeadFromWebsite(websiteUrl: string): Promise<EnrichmentResult> {
  try {
    const res = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspeccaoB2B/1.0)" },
    });
    if (!res.ok) return { email: null, instagramHandle: null };

    const html = await res.text();
    return { email: extractFirstEmail(html), instagramHandle: extractInstagramHandle(html) };
  } catch {
    return { email: null, instagramHandle: null };
  }
}
