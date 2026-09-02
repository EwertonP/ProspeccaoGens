"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ScrapeRun } from "@/lib/types";

const STATUS_LABEL: Record<ScrapeRun["status"], string> = {
  queued: "⏳ Na fila",
  running: "🔄 Rodando",
  succeeded: "✅ Concluída",
  failed: "❌ Falhou",
  partial: "⚠️ Parcial",
};

export default function RunsPage() {
  const [runs, setRuns] = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [term, setTerm] = useState("");
  const [location, setLocation] = useState("");
  const [maxPlaces, setMaxPlaces] = useState(30);

  async function loadRuns() {
    const res = await fetch("/api/scrape-runs");
    if (res.ok) setRuns(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadRuns();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const res = await fetch("/api/scrape-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchStringsArray: [term],
        locationQuery: location,
        maxCrawledPlacesPerSearch: maxPlaces,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setFormError(body.error ?? "Falha ao disparar a coleta");
    } else {
      setTerm("");
      setLocation("");
      await loadRuns();
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Nova coleta (Google Maps)</h1>
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border bg-white p-5 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="text-sm text-neutral-600">Termo de busca</label>
            <input
              required
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="ex: clínica de estética"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="text-sm text-neutral-600">Localização</label>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ex: São Paulo, Brasil"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="text-sm text-neutral-600">Máx. de lugares</label>
            <input
              type="number"
              min={1}
              max={500}
              value={maxPlaces}
              onChange={(e) => setMaxPlaces(Number(e.target.value))}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-4">
            {formError && <p className="mb-2 text-sm text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? "Disparando…" : "Disparar coleta"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Histórico</h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Carregando…</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma coleta disparada ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50 text-left text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Busca</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Encontrados</th>
                  <th className="px-4 py-2">Novos</th>
                  <th className="px-4 py-2">Já existiam</th>
                  <th className="px-4 py-2">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b last:border-0 hover:bg-neutral-50">
                    <td className="px-4 py-2">
                      <Link href={`/runs/${run.id}`} className="text-neutral-900 underline-offset-2 hover:underline">
                        {(run.search_params?.searchStringsArray as string[] | undefined)?.join(", ") ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{STATUS_LABEL[run.status]}</td>
                    <td className="px-4 py-2">{run.items_found ?? "—"}</td>
                    <td className="px-4 py-2">{run.items_imported ?? "—"}</td>
                    <td className="px-4 py-2">{run.items_deduped ?? "—"}</td>
                    <td className="px-4 py-2 text-neutral-500">{new Date(run.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
