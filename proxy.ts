import { auth } from "@/lib/auth/server";

// Substitui o middleware baseado em Supabase Auth. auth.middleware() já
// cuida de validar a sessão, redirecionar pra login, e renovar o token --
// mas rotas públicas (webhook do Apify, cron, unsubscribe de e-mail) usam
// secret/token próprio, não sessão de usuário, então continuam liberadas
// via matcher abaixo.
export default auth.middleware({
  loginUrl: "/login",
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|signup|api/auth|api/scrape-runs/apify-webhook|api/cron|api/outreach/email/unsubscribe).*)",
  ],
};
