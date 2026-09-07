"use client";

import { useActionState } from "react";
import { signUpAction } from "@/app/actions";

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
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <form action={formAction} className="w-full max-w-sm space-y-4 rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold">Criar conta</h1>
        <div className="space-y-1">
          <label className="text-sm text-neutral-600">Nome</label>
          <input name="name" required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-neutral-600">E-mail</label>
          <input name="email" type="email" required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-neutral-600">Senha</label>
          <input name="password" type="password" required minLength={8} className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Criando…" : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
