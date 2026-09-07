import { auth } from "@/lib/auth/server";

// Catch-all pra todas as chamadas de auth do lado do cliente (sign-in,
// sign-up, callbacks OAuth, sessão, verificação de e-mail).
export const { GET, POST } = auth.handler();
