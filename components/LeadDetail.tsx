"use client";

import { useEffect, useState, useCallback } from "react";
import type { Lead, LeadSignal, LeadActivity } from "@/lib/types";
import { Button, Card, CardTitle, ConfidenceBadge, LinkButton, ScoreBadge } from "@/components/ui";

// Conteúdo do detalhe de um lead (Contato, Sinais, Prospecção manual,
// Histórico) -- extraído de app/(app)/leads/[id]/page.tsx pra ser reusado
// tanto no painel deslizante de app/(app)/leads/page.tsx quanto na página
// própria (link direto), sem duplicar a lógica de fetch/ações.

function signalLabel(signal: LeadSignal): string {
  if (signal.confidence === "nao_verificavel" || signal.value === null) return "Não verificável nesta fonte";
  return signal.value ? "Sim" : "Não";
}

export function LeadDetail({ leadId, onClose }: { leadId: string; onClose?: () => void }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [signals, setSignals] = useState<LeadSignal[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/leads/${leadId}`);
    if (res.ok) {
      const body = await res.json();
      setLead(body.lead);
      setSignals(body.signals);
      setActivities(body.activities);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  async function logActivity(channel: LeadActivity["channel"], type: LeadActivity["type"], body?: string) {
    setBusy(true);
    await fetch(`/api/leads/${leadId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, type, body }),
    });
    await load();
    setBusy(false);
  }

  async function handleEnrich() {
    setBusy(true);
    await fetch(`/api/leads/${leadId}/enrich`, { method: "POST" });
    await load();
    setBusy(false);
  }

  if (loading) return <p className="text-sm text-muted">Carregando…</p>;
  if (!lead) return <p className="text-sm text-muted">Lead não encontrado.</p>;

  const whatsappMessage = `Oi! Vi o perfil de vocês (${lead.name}) e queria entender melhor como está a presença de vocês hoje online. Faz sentido uma conversa rápida essa semana?`;
  const whatsappUrl = lead.whatsapp_phone || lead.phone
    ? `https://wa.me/${(lead.whatsapp_phone ?? lead.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`
    : null;
  const instagramUrl = lead.instagram_handle ? `https://instagram.com/${lead.instagram_handle}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{lead.name}</h1>
          <p className="text-sm text-muted">{lead.category} · {lead.city}</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <p className="text-3xl font-bold text-foreground">{lead.score ?? "—"}</p>
            <ScoreBadge score={lead.score} />
          </div>
          {onClose && (
            <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Fechar">
              ✕
            </button>
          )}
        </div>
      </div>

      {lead.promoted_notion_page_id && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          Já promovido pro Kanban de Leads Qualificados no Notion.
        </p>
      )}

      <Card>
        <CardTitle>Contato</CardTitle>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-muted">Telefone</dt><dd className="text-foreground">{lead.phone ?? "—"}</dd></div>
          <div><dt className="text-muted">Website</dt><dd>{lead.website_url ? <a href={lead.website_url} target="_blank" className="text-accent hover:underline">abrir</a> : <span className="text-foreground">—</span>}</dd></div>
          <div><dt className="text-muted">E-mail</dt><dd className="text-foreground">{lead.email ?? "—"}</dd></div>
          <div><dt className="text-muted">Instagram</dt><dd className="text-foreground">{lead.instagram_handle ?? "—"}</dd></div>
        </dl>
        {!lead.email && !lead.instagram_handle && lead.website_url && (
          <button onClick={handleEnrich} disabled={busy} className="mt-3 text-sm text-accent hover:underline disabled:opacity-50">
            Buscar e-mail/Instagram no site
          </button>
        )}
      </Card>

      <Card>
        <CardTitle>Sinais de qualificação</CardTitle>
        <ul className="grid gap-2 sm:grid-cols-2">
          {signals.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span className="text-foreground">{s.signal_key.replaceAll("_", " ")}</span>
              <ConfidenceBadge confidence={s.confidence}>{signalLabel(s)}</ConfidenceBadge>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Prospecção manual</CardTitle>
        <div className="flex flex-wrap gap-3">
          {whatsappUrl ? (
            <LinkButton href={whatsappUrl} target="_blank" onClick={() => logActivity("whatsapp", "mensagem_enviada")} className="!bg-emerald-600 !text-white hover:!bg-emerald-700">
              Abrir WhatsApp
            </LinkButton>
          ) : (
            <span className="text-sm text-muted">Sem telefone válido pra WhatsApp</span>
          )}
          {instagramUrl && (
            <LinkButton href={instagramUrl} target="_blank" onClick={() => logActivity("instagram", "mensagem_enviada")} className="!bg-pink-600 !text-white hover:!bg-pink-700">
              Abrir Instagram
            </LinkButton>
          )}
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(whatsappMessage)}>
            Copiar mensagem
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Histórico</CardTitle>
        {activities.length === 0 ? (
          <p className="text-sm text-muted">Nenhum contato registrado ainda.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activities.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-border pb-2 last:border-0">
                <span className="text-foreground">{a.channel} · {a.type}{a.body ? ` — ${a.body}` : ""}</span>
                <span className="text-muted">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
