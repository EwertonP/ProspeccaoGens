"use client";

import { useActionState } from "react";
import { signInAction } from "@/app/actions";
import { Button, Input, Label } from "@/components/ui";

const initialState: { error?: string } = {};

// Login simples e-mail/senha via Server Action (Neon Auth) -- ferramenta
// interna de tenant único, sem signup público (contas são criadas
// manualmente no Console do Neon: Auth -> Users, ou via auth.signUp.email
// numa rota administrativa futura).
export default function LoginPage() {
  const [state, formAction, pending] = useActionState(async (_prev: typeof initialState, formData: FormData) => {
    const result = await signInAction(formData);
    return result ?? {};
  }, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form action={formAction} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xl">⛏️</span>
          <h1 className="text-lg font-semibold text-foreground">Prospecção B2B</h1>
        </div>
        <div>
          <Label>E-mail</Label>
          <Input name="email" type="email" required />
        </div>
        <div>
          <Label>Senha</Label>
          <Input name="password" type="password" required />
        </div>
        {state?.error && <p className="text-sm text-rose-400">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
