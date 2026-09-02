"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { ScrapeRun } from "@/lib/types";

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

  if (loading) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!run) return <p className="text-sm text-neutral-500">Coleta não encontrada.</p>;

  return (
    <div className="space-y-4">
      <Link href="/runs" className="text-sm text-neutral-500 hover:underline">← Voltar</Link>
      <h1 className="text-xl font-semibold">Coleta — {run.source}</h1>
      <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-white p-5 text-sm sm:grid-cols-3">
        <div><dt className="text-neutral-500">Status</dt><dd className="font-medium">{run.status}</dd></div>
        <div><dt className="text-neutral-500">Encontrados</dt><dd className="font-medium">{run.items_found ?? "—"}</dd></div>
        <div><dt className="text-neutral-500">Novos</dt><dd className="font-medium">{run.items_imported ?? "—"}</dd></div>
        <div><dt className="text-neutral-500">Já existiam</dt><dd className="font-medium">{run.items_deduped ?? "—"}</dd></div>
        <div><dt className="text-neutral-500">Iniciada</dt><dd className="font-medium">{run.started_at ? new Date(run.started_at).toLocaleString("pt-BR") : "—"}</dd></div>
        <div><dt className="text-neutral-500">Finalizada</dt><dd className="font-medium">{run.finished_at ? new Date(run.finished_at).toLocaleString("pt-BR") : "—"}</dd></div>
      </dl>
      {run.error_message && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{run.error_message}</p>
      )}
      {run.status === "succeeded" && (
        <Link href={`/leads?status=novo`} className="inline-block rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          Ver leads coletados
        </Link>
      )}
    </div>
  );
}
