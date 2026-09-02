import { Resend } from "resend";

// Wrapper fino sobre o Resend -- mesmo padrão de lib/email/resend.ts do
// plataforma-agencia: se a credencial não estiver configurada (dev local,
// domínio ainda não verificado), a chamada é ignorada silenciosamente (loga
// um aviso) em vez de derrubar a rota que disparou o envio.

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "Prospecção <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; id?: string; error?: string }> {
  const resend = getClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY não configurada — e-mail não enviado:", input.subject);
    return { sent: false, error: "RESEND_API_KEY não configurada" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      console.error("[email] falha ao enviar via Resend:", error);
      return { sent: false, error: error.message };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error("[email] exceção ao enviar via Resend:", err);
    return { sent: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}
