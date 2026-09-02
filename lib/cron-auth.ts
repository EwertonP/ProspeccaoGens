import type { NextRequest } from "next/server";

// Autorização compartilhada por rotas chamadas por jobs (Vercel Cron) ou pelo
// webhook do Apify. Aceita dois formatos, ambos comparados contra CRON_SECRET:
//   - header x-cron-secret: usado pelo webhook do Apify e chamadas manuais/curl.
//   - header Authorization: Bearer <CRON_SECRET>: injetado automaticamente pelo
//     Vercel Cron em toda chamada disparada por um schedule em vercel.json.
// Fail-closed: sem CRON_SECRET configurado, nenhuma chamada é autorizada.
// Mesmo padrão de lib/cron-auth.ts do plataforma-agencia.
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const providedHeaderSecret = req.headers.get("x-cron-secret");
  if (providedHeaderSecret === cronSecret) return true;

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}
