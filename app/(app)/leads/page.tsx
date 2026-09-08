"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Lead } from "@/lib/types";
import { Avatar, Button, Input, LeadStatusBadge, ScoreBadge, Select } from "@/components/ui";

const STATUS_LABEL: Record<Lead["status"], string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  descartado: "Descartado",
  contatado: "Contatado",
  promovido: "No Notion",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [minScore, setMinScore] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (minScore > 0) params.set("minScore", String(minScore));
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/leads?${params}`);
    if (res.ok) setLeads(await res.json());
    setLoading(false);
  }, [minScore, statusFilter]);

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
          <Button onClick={handlePromote} disabled={selected.size === 0 || promoting}>
            {promoting ? "Promovendo…" : `Promover ${selected.size || ""} pro Notion`}
          </Button>
        </div>
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
                    <Link href={`/leads/${lead.id}`} className="flex items-center gap-3 font-medium text-foreground hover:text-accent">
                      <Avatar name={lead.name} />
                      {lead.name}
                    </Link>
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
                    <LeadStatusBadge status={lead.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
