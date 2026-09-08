"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Campaign } from "@/lib/types";
import { Badge, Button, Card } from "@/components/ui";

const STATUS_TONE: Record<Campaign["status"], "emerald" | "neutral" | "accent"> = {
  ativa: "emerald",
  pausada: "neutral",
  concluida: "accent",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((res) => res.json())
      .then(setCampaigns)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Campanhas</h1>
        <Link href="/campaigns/new">
          <Button>+ Nova campanha</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : campaigns.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Nenhuma campanha ainda. Crie uma pra descrever o que você vende e deixar a IA montar a busca de leads.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold leading-snug text-foreground">{c.name}</h2>
                <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
              </div>
              <p className="line-clamp-2 text-sm text-muted">{c.product_pitch}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">{c.lead_count ?? 0} leads</span>
                <span className="text-muted">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
              <Link href={`/leads?campaignId=${c.id}`} className="block text-sm text-accent hover:underline">
                Ver leads →
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Link href="/runs" className="inline-block text-xs text-muted hover:text-foreground">
        Ver coletas técnicas (histórico de runs no Apify) →
      </Link>
    </div>
  );
}
