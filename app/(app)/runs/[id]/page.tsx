"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { ScrapeRun } from "@/lib/types";
import { LinkButton, RunStatusBadge } from "@/components/ui";

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<ScrapeRun | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/scrape-runs");
      if (!res.ok || cancelled) return;
      const runs: ScrapeRun[] = await res.json();
      setRun(runs.find((r) => r.id === id) ?? null);
      setLoading(false);
    }

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  if (loading) return <p className="text-sm text-muted">Carregando…</p>;
  if (!run) return <p className="text-sm text-muted">Coleta não encontrada.</p>;

  return (
    <div className="space-y-4">
      <Link href="/runs" className="text-sm text-muted hover:text-foreground">← Voltar</Link>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-foreground">Coleta — {run.source}</h1>
        <RunStatusBadge status={run.status} />
      </div>
      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-5 text-sm sm:grid-cols-3">
        <div><dt className="text-muted">Encontrados</dt><dd className="font-medium text-foreground">{run.items_found ?? "—"}</dd></div>
        <div><dt className="text-muted">Novos</dt><dd className="font-medium text-foreground">{run.items_imported ?? "—"}</dd></div>
        <div><dt className="text-muted">Já existiam</dt><dd className="font-medium text-foreground">{run.items_deduped ?? "—"}</dd></div>
        <div><dt className="text-muted">Iniciada</dt><dd className="font-medium text-foreground">{run.started_at ? new Date(run.started_at).toLocaleString("pt-BR") : "—"}</dd></div>
        <div><dt className="text-muted">Finalizada</dt><dd className="font-medium text-foreground">{run.finished_at ? new Date(run.finished_at).toLocaleString("pt-BR") : "—"}</dd></div>
      </dl>
      {run.error_message && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">{run.error_message}</p>
      )}
      {run.status === "succeeded" && (
        <LinkButton href="/leads?status=novo">Ver leads coletados</LinkButton>
      )}
    </div>
  );
}
