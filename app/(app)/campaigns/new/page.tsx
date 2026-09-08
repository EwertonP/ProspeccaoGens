"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";

// Wizard de 5 perguntas -- espelha o fluxo "Garimpar leads" do Garimpo
// Leads: em vez de pedir termo de busca técnico, coleta um briefing em
// linguagem natural que lib/ai/campaign-brief.ts traduz em estratégia de
// busca (1 chamada de IA por campanha, ver DESIGN_SYSTEM.md/plano).
const LOCATION_HUBS = [
  "São Paulo, SP",
  "Rio de Janeiro, RJ",
  "Curitiba, PR",
  "Belo Horizonte, MG",
  "Porto Alegre, RS",
  "Campinas, SP",
  "Florianópolis, SC",
  "Brasília, DF",
  "Salvador, BA",
];

interface Brief {
  productPitch: string;
  buyerPersona: string;
  problemSolved: string;
  locationQuery: string;
  existingCustomers: string;
}

const STEPS = [
  { key: "productPitch" as const, label: "O que você faz ou vende?", hint: "Escreva de forma simples em uma ou duas frases qual produto ou serviço você oferece.", placeholder: "Ex: Sistema de agendamento e confirmação de consultas via WhatsApp pra clínicas.", optional: false },
  { key: "buyerPersona" as const, label: "Quem costuma fechar negócio com você?", hint: "Quem é a pessoa, cargo ou tipo de empresa que costuma comprar de você?", placeholder: "Ex: Donos de clínicas de estética, consultórios odontológicos ou gerentes.", optional: false },
  { key: "problemSolved" as const, label: "Qual problema você resolve pra esse cliente?", hint: "O que faz ele querer contratar você hoje? (Opcional -- a IA deduz se deixar em branco).", placeholder: "Ex: Reduzo faltas de pacientes nas consultas e acabo com o trabalho manual na recepção.", optional: true },
  { key: "locationQuery" as const, label: "Onde quer buscar os leads?", hint: "Cidade, estado ou região. Deixe em branco pra buscar no Brasil inteiro.", placeholder: "Ex: São Paulo, interior de SP, Curitiba, Brasil", optional: true },
  { key: "existingCustomers" as const, label: "Clientes que já fecharam com você", hint: "1 ou 2 exemplos rápidos de clientes atuais pra IA calibrar o perfil exato. (Opcional).", placeholder: "Ex: Clínica Bella em SP, Estética Aurora em Campinas", optional: true },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<Brief>({
    productPitch: "",
    buyerPersona: "",
    problemSolved: "",
    locationQuery: "",
    existingCustomers: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = STEPS[step];
  const value = brief[current.key];
  const canContinue = current.optional || value.trim().length > 0;

  function updateValue(v: string) {
    setBrief((prev) => ({ ...prev, [current.key]: v }));
  }

  async function handleFinish() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brief),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Falha ao criar a campanha");
      setSubmitting(false);
      return;
    }
    router.push("/campaigns");
  }

  function next() {
    if (step === STEPS.length - 1) {
      handleFinish();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="text-muted hover:text-foreground">←</Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Nova campanha</p>
          <h1 className="text-2xl font-bold text-foreground">Garimpar leads</h1>
        </div>
      </div>

      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-surface-hover"}`} />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent">
            Pergunta {step + 1} de {STEPS.length}
            {current.optional && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">Opcional</span>}
          </div>
        </div>

        <h2 className="mb-2 text-lg font-semibold text-foreground">{current.label}</h2>
        <p className="mb-4 text-sm text-muted">{current.hint}</p>

        <textarea
          autoFocus
          value={value}
          onChange={(e) => updateValue(e.target.value)}
          placeholder={current.placeholder}
          rows={current.key === "productPitch" ? 4 : 2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />

        {current.key === "locationQuery" && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-muted">Polos empresariais sugeridos:</p>
            <div className="flex flex-wrap gap-2">
              {LOCATION_HUBS.map((hub) => (
                <button
                  key={hub}
                  type="button"
                  onClick={() => updateValue(hub)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    value === hub ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {hub}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
            ← Voltar
          </Button>
          <Button onClick={next} disabled={(!canContinue && !current.optional) || submitting}>
            {submitting
              ? "Analisando…"
              : step === STEPS.length - 1
                ? "Analisar com IA →"
                : current.optional && !value.trim()
                  ? "Pular (opcional) →"
                  : "Continuar →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
