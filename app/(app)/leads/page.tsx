"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Lead } from "@/lib/types";

const STATUS_LABEL: Record<Lead["status"], string> = {
  novo: "🆕 Novo",
  qualificado: "✅ Qualificado",
  descartado: "🗑️ Descartado",
  contatado: "📤 Contatado",
  promovido: "🎯 No Notion",
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
        <h1 className="text-xl font-semibold">Leads</h1>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-neutral-500">Score mínimo</label>
            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-24 rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border px-2 py-1 text-sm">
              <option value="">Todos</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handlePromote}
            disabled={selected.size === 0 || promoting}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {promoting ? "Promovendo…" : `Promover ${selected.size || ""} pro Notion`}
          </button>
        </div>
      </div>

      {promoteError && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{promoteError}</p>}

      {loading ? (
        <p className="text-sm text-neutral-500">Carregando…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum lead encontrado com esses filtros.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">Negócio</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Cidade</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-neutral-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggle(lead.id)}
                      disabled={lead.status === "promovido"}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-neutral-900 hover:underline">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-neutral-600">{lead.category ?? "—"}</td>
                  <td className="px-3 py-2 text-neutral-600">{lead.city ?? "—"}</td>
                  <td className="px-3 py-2 font-medium">{lead.score ?? "—"}</td>
                  <td className="px-3 py-2">{STATUS_LABEL[lead.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
