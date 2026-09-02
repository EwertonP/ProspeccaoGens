import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { promoteLeadToNotion } from "@/lib/notion-bridge/promote";
import { NotionCredentialsError } from "@/lib/notion-bridge/client";
import type { Lead, LeadSignal } from "@/lib/types";

// POST /api/leads/promote { leadIds: string[] } -- promove em lote pro
// Kanban "Leads Qualificados" no Notion. Idempotente por lead: quem já tem
// promoted_notion_page_id não cria página duplicada.
export async function POST(req: NextRequest) {
  const { leadIds } = await req.json();
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds (array não vazio) é obrigatório" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  const results: { leadId: string; ok: boolean; pageId?: string; alreadyPromoted?: boolean; error?: string }[] = [];

  for (const leadId of leadIds as string[]) {
    try {
      const [{ data: lead, error: leadError }, { data: signalRows }] = await Promise.all([
        supabase.from("leads").select("*").eq("id", leadId).single(),
        supabase.from("lead_signals").select("signal_key, value").eq("lead_id", leadId),
      ]);
      if (leadError || !lead) throw new Error(leadError?.message ?? "lead não encontrado");

      const signalMap = new Map((signalRows ?? []).map((s: Pick<LeadSignal, "signal_key" | "value">) => [s.signal_key, s.value]));

      const { pageId, alreadyPromoted } = await promoteLeadToNotion({
        lead: lead as Lead,
        signals: {
          has_website: signalMap.get("has_website") ?? (lead as Lead).website_url !== null,
          runs_paid_ads: signalMap.get("runs_paid_ads") ?? null,
          posts_regularly: signalMap.get("posts_regularly") ?? null,
        },
        appBaseUrl,
      });

      if (!alreadyPromoted) {
        await supabase
          .from("leads")
          .update({ status: "promovido", promoted_notion_page_id: pageId, promoted_at: new Date().toISOString() })
          .eq("id", leadId);
      }

      results.push({ leadId, ok: true, pageId, alreadyPromoted });
    } catch (err) {
      const message =
        err instanceof NotionCredentialsError ? err.message : err instanceof Error ? err.message : "erro desconhecido";
      results.push({ leadId, ok: false, error: message });
    }
  }

  const hasCredentialsError = results.some((r) => !r.ok && r.error?.includes("NOTION_"));
  return NextResponse.json({ results }, { status: hasCredentialsError ? 501 : 200 });
}
