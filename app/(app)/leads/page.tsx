"use client";

import { useEffect, useState, useCallback } from "react";
import type { Campaign, Lead, LeadStatus } from "@/lib/types";
import { Avatar, Button, Input, ScoreBadge, Select } from "@/components/ui";
import { LeadDetail } from "@/components/LeadDetail";

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  descartado: "Descartado",
  contatado: "Contatado",
  promovido: "No Notion",
};

type Stats = { total: number } & Record<LeadStatus, number>;

const EMPTY_STATS: Stats = { total: 0, novo: 0, qualificado: 0, contatado: 0, descartado: 0, promovido: 0 };

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [minScore, setMinScore] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("campaignId");
    if (fromUrl) setCampaignId(fromUrl);
    fetch("/api/campaigns").then((res) => res.json()).then(setCampaigns);
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (minScore > 0) params.set("minScore", String(minScore));
    if (statusFilter) params.set("status", statusFilter);
    const [leadsRes, statsRes] = await Promise.all([
      fetch(`/api/leads?${params}`),
      fetch(`/api/leads/stats${campaignId ? `?campaignId=${campaignId}` : ""}`),
    ]);
    if (leadsRes.ok) {
      const all: Lead[] = await leadsRes.json();
      setLeads(campaignId ? all.filter((l) => l.campaign_id === campaignId) : all);
    }
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }, [minScore, statusFilter, campaignId]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function updateStatus(id: string, status: LeadStatus) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadLeads();
  }

  async function handlePromote() {
    setPromoting(true);
    setPromoteError(null);

    const res = await fetch("/api/leads/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: Array.from(selected) }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPromoteError(body.error ?? "Falha ao promover leads pro Notion");
    } else {
      const failed = (body.results ?? []).filter((r: { ok: boolean }) => !r.ok);
      if (failed.length > 0) setPromoteError(`${failed.length} lead(s) falharam: ${failed[0].error}`);
      setSelected(new Set());
      await loadLeads();
    }
    setPromoting(false);
  }

  const STATUS_PILLS: { key: keyof Stats; label: string }[] = [
    { key: "total", label: "total" },
    { key: "novo", label: "novos" },
    { key: "qualificado", label: "qualificados" },
    { key: "contatado", label: "contatados" },
    { key: "descartado", label: "descartados" },
    { key: "promovido", label: "no Notion" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Leads</h1>
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Score mínimo</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-24"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Status</label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Campanha</label>
            <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">Todas campanhas</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <Button onClick={handlePromote} disabled={selected.size === 0 || promoting}>
            {promoting ? "Promovendo…" : `Promover ${selected.size || ""} pro Notion`}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_PILLS.map(({ key, label }) => (
          <span key={key} className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            <span className="font-semibold text-foreground">{stats[key]}</span> {label}
          </span>
        ))}
      </div>

      {promoteError && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">{promoteError}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-muted">Nenhum lead encontrado com esses filtros.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-3"></th>
                <th className="px-3 py-3"></th>
                <th className="px-3 py-3">Negócio</th>
                <th className="px-3 py-3">Categoria</th>
                <th className="px-3 py-3">Cidade</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggle(lead.id)}
                      disabled={lead.status === "promovido"}
                      className="accent-accent"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        title="Qualificar"
                        onClick={() => updateStatus(lead.id, "qualificado")}
                        className="text-muted hover:text-emerald-400"
                      >
                        👍
                      </button>
                      <button
                        title="Descartar"
                        onClick={() => updateStatus(lead.id, "descartado")}
                        className="text-muted hover:text-rose-400"
                      >
                        👎
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => setOpenLeadId(lead.id)} className="flex items-center gap-3 font-medium text-foreground hover:text-accent">
                      <Avatar name={lead.name} />
                      {lead.name}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-muted">{lead.category ?? "—"}</td>
                  <td className="px-3 py-3 text-muted">{lead.city ?? "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{lead.score ?? "—"}</span>
                      <ScoreBadge score={lead.score} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                      className="!py-1 text-xs"
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openLeadId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setOpenLeadId(null)}>
          <div
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <LeadDetail leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
