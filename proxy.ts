import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas públicas: login, e endpoints chamados por sistemas externos
// (webhook do Apify, cron, link de descadastro de e-mail) que não têm
// como carregar uma sessão de navegador -- esses se autenticam sozinhos
// via secret compartilhado (ver lib/cron-auth.ts) ou token HMAC.
const PUBLIC_PATHS = [
  "/login",
  "/api/scrape-runs/apify-webhook",
  "/api/cron/",
  "/api/outreach/email/unsubscribe",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) req.cookies.set(name, value);
          response = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
