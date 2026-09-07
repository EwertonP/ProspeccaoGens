import { createNeonAuth } from "@neondatabase/auth/next/server";

// Instância única de auth do lado do servidor (Server Components, Server
// Actions, API Routes, middleware). Substitui o Supabase Auth -- Managed
// Better Auth do Neon, provisionado junto com o projeto (ver .env.local
// NEON_AUTH_BASE_URL/NEON_AUTH_COOKIE_SECRET).
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
