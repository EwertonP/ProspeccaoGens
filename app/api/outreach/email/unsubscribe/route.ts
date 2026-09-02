import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

// GET /api/outreach/email/unsubscribe?lead_id=...&token=... -- link do
// rodapé LGPD. Sem sessão/login (é clicado por quem recebeu o e-mail) --
// segurança vem só do token HMAC, por isso a verificação é obrigatória
// antes de qualquer escrita.
export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("lead_id");
  const token = req.nextUrl.searchParams.get("token");

  if (!leadId || !token || !verifyUnsubscribeToken(leadId, token)) {
    return NextResponse.json({ error: "link inválido" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").update({ email_opt_out: true }).eq("id", leadId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return new NextResponse(
    "<html><body style='font-family:sans-serif;padding:2rem'><p>Você não receberá mais e-mails nossos. Obrigado.</p></body></html>",
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
