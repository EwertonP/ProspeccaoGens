"use client";

import { use } from "react";
import Link from "next/link";
import { LeadDetail } from "@/components/LeadDetail";

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="space-y-6">
      <Link href="/leads" className="text-sm text-muted hover:text-foreground">← Voltar</Link>
      <LeadDetail leadId={id} />
    </div>
  );
}
