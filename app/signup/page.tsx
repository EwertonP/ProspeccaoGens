"use client";

import { useActionState } from "react";
import { signUpAction } from "@/app/actions";
import { Button, Input, Label } from "@/components/ui";

const initialState: { error?: string } = {};

// Criação de conta -- sem link visível no login de propósito (ferramenta
// interna de tenant único). Usar uma vez pra criar a conta da equipe, via
// /signup direto na URL.
export default function SignupPage() {
  const [state, formAction, pending] = useActionState(async (_prev: typeof initialState, formData: FormData) => {
    const result = await signUpAction(formData);
    return result ?? {};
  }, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form action={formAction} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xl">⛏️</span>
          <h1 className="text-lg font-semibold text-foreground">Criar conta</h1>
        </div>
        <div>
          <Label>Nome</Label>
          <Input name="name" required />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input name="email" type="email" required />
        </div>
        <div>
          <Label>Senha</Label>
          <Input name="password" type="password" required minLength={8} />
        </div>
        {state?.error && <p className="text-sm text-rose-400">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Criando…" : "Criar conta"}
        </Button>
      </form>
    </div>
  );
}
