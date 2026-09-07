import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { promoteLeadToNotion } from "@/lib/notion-bridge/promote";
import { NotionCredentialsError } from "@/lib/notion-bridge/client";
import type { Lead } from "@/lib/types";

// POST /api/leads/promote { leadIds: string[] } -- promove em lote pro
// Kanban "Leads Qualificados" no Notion. Idempotente por lead: quem já tem
// promoted_notion_page_id não cria página duplicada.
export async function POST(req: NextRequest) {
  const { leadIds } = await req.json();
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds (array não vazio) é obrigatório" }, { status: 400 });
  }

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const results: { leadId: string; ok: boolean; pageId?: string; alreadyPromoted?: boolean; error?: string }[] = [];

  for (const leadId of leadIds as string[]) {
    try {
      const [[lead], signalRows] = await Promise.all([
        sql`select * from leads where id = ${leadId}`,
        sql`select signal_key, value from lead_signals where lead_id = ${leadId}`,
      ]);
      if (!lead) throw new Error("lead não encontrado");

      const signalMap = new Map(signalRows.map((s) => [s.signal_key as string, s.value as boolean | null]));

      const { pageId, alreadyPromoted } = await promoteLeadToNotion({
        lead: lead as unknown as Lead,
        signals: {
          has_website: signalMap.get("has_website") ?? (lead as unknown as Lead).website_url !== null,
          runs_paid_ads: signalMap.get("runs_paid_ads") ?? null,
          posts_regularly: signalMap.get("posts_regularly") ?? null,
        },
        appBaseUrl,
      });

      if (!alreadyPromoted) {
        await sql`update leads set status = 'promovido', promoted_notion_page_id = ${pageId}, promoted_at = now() where id = ${leadId}`;
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
