"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ScrapeRun } from "@/lib/types";
import { Button, Card, CardTitle, Input, Label, RunStatusBadge } from "@/components/ui";

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
        <h1 className="mb-4 text-xl font-semibold text-foreground">Nova coleta (Google Maps)</h1>
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-border bg-surface p-5 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label>Termo de busca</Label>
            <Input
              required
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="ex: clínica de estética"
            />
          </div>
          <div className="sm:col-span-1">
            <Label>Localização</Label>
            <Input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ex: São Paulo, Brasil"
            />
          </div>
          <div className="sm:col-span-1">
            <Label>Máx. de lugares</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={maxPlaces}
              onChange={(e) => setMaxPlaces(Number(e.target.value))}
            />
          </div>
          <div className="sm:col-span-4">
            {formError && <p className="mb-2 text-sm text-rose-400">{formError}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Disparando…" : "Disparar coleta"}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Histórico</h2>
        {loading ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma coleta disparada ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Busca</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Encontrados</th>
                  <th className="px-4 py-3">Novos</th>
                  <th className="px-4 py-3">Já existiam</th>
                  <th className="px-4 py-3">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <Link href={`/runs/${run.id}`} className="font-medium text-foreground hover:text-accent">
                        {(run.search_params?.searchStringsArray as string[] | undefined)?.join(", ") ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><RunStatusBadge status={run.status} /></td>
                    <td className="px-4 py-3 text-foreground">{run.items_found ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">{run.items_imported ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">{run.items_deduped ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{new Date(run.created_at).toLocaleString("pt-BR")}</td>
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
