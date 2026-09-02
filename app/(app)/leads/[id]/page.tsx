"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import type { Lead, LeadSignal, LeadActivity } from "@/lib/types";

const CONFIDENCE_BADGE: Record<LeadSignal["confidence"], string> = {
  observado: "bg-green-100 text-green-800",
  inferido: "bg-amber-100 text-amber-800",
  nao_verificavel: "bg-neutral-100 text-neutral-500",
};

function signalLabel(signal: LeadSignal): string {
  if (signal.confidence === "nao_verificavel" || signal.value === null) return "Não verificável nesta fonte";
  return signal.value ? "Sim" : "Não";
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [signals, setSignals] = useState<LeadSignal[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/leads/${id}`);
    if (res.ok) {
      const body = await res.json();
      setLead(body.lead);
      setSignals(body.signals);
      setActivities(body.activities);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function logActivity(channel: LeadActivity["channel"], type: LeadActivity["type"], body?: string) {
    setBusy(true);
    await fetch(`/api/leads/${id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, type, body }),
    });
    await load();
    setBusy(false);
  }

  async function handleEnrich() {
    setBusy(true);
    await fetch(`/api/leads/${id}/enrich`, { method: "POST" });
    await load();
    setBusy(false);
  }

  if (loading) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!lead) return <p className="text-sm text-neutral-500">Lead não encontrado.</p>;

  const whatsappMessage = `Oi! Vi o perfil de vocês (${lead.name}) e queria entender melhor como está a presença de vocês hoje online. Faz sentido uma conversa rápida essa semana?`;
  const whatsappUrl = lead.whatsapp_phone || lead.phone
    ? `https://wa.me/${(lead.whatsapp_phone ?? lead.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`
    : null;
  const instagramUrl = lead.instagram_handle ? `https://instagram.com/${lead.instagram_handle}` : null;

  return (
    <div className="space-y-6">
      <Link href="/leads" className="text-sm text-neutral-500 hover:underline">← Voltar</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{lead.name}</h1>
          <p className="text-sm text-neutral-500">{lead.category} · {lead.city}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{lead.score ?? "—"}</p>
          <p className="text-xs text-neutral-500">score</p>
        </div>
      </div>

      {lead.promoted_notion_page_id && (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Já promovido pro Kanban de Leads Qualificados no Notion.
        </p>
      )}

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Contato</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-neutral-500">Telefone</dt><dd>{lead.phone ?? "—"}</dd></div>
          <div><dt className="text-neutral-500">Website</dt><dd>{lead.website_url ? <a href={lead.website_url} target="_blank" className="text-blue-600 hover:underline">abrir</a> : "—"}</dd></div>
          <div><dt className="text-neutral-500">E-mail</dt><dd>{lead.email ?? "—"}</dd></div>
          <div><dt className="text-neutral-500">Instagram</dt><dd>{lead.instagram_handle ?? "—"}</dd></div>
        </dl>
        {!lead.email && !lead.instagram_handle && lead.website_url && (
          <button onClick={handleEnrich} disabled={busy} className="mt-3 text-sm text-blue-600 hover:underline disabled:opacity-50">
            Buscar e-mail/Instagram no site
          </button>
        )}
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Sinais de qualificação</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {signals.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
              <span className="text-neutral-700">{s.signal_key.replaceAll("_", " ")}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${CONFIDENCE_BADGE[s.confidence]}`}>
                {signalLabel(s)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Prospecção manual</h2>
        <div className="flex flex-wrap gap-3">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              onClick={() => logActivity("whatsapp", "mensagem_enviada")}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Abrir WhatsApp
            </a>
          ) : (
            <span className="text-sm text-neutral-400">Sem telefone válido pra WhatsApp</span>
          )}
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              onClick={() => logActivity("instagram", "mensagem_enviada")}
              className="rounded bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
            >
              Abrir Instagram
            </a>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(whatsappMessage)}
            className="rounded border px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Copiar mensagem
          </button>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Histórico</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum contato registrado ainda.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activities.map((a) => (
              <li key={a.id} className="flex justify-between border-b pb-2 last:border-0">
                <span>{a.channel} · {a.type}{a.body ? ` — ${a.body}` : ""}</span>
                <span className="text-neutral-400">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
