import { createAdminClient } from "./supabase/admin";
import { fetchDatasetItems } from "./apify";
import { extractGoogleMapsLead } from "./signals/google-maps";
import { computeScore, toScoreInputs } from "./scoring";
import type { Lead } from "./types";

export interface IngestResult {
  found: number;
  imported: number;
  deduped: number;
}

// Puxa o dataset de uma run terminada e faz upsert em `leads` -- chamada
// tanto pelo webhook do Apify quanto pelo cron de rede de segurança
// (app/api/cron/poll-scrape-runs), por isso vive num lib compartilhado em
// vez de duplicada nas duas rotas.
//
// Preserva status/score já curados por humano: o upsert NUNCA sobrescreve
// `status` de um lead existente (só a primeira inserção usa o default
// 'novo') -- só os dados brutos (raw_payload, nome, endereço etc.) são
// atualizados numa reraspagem.
export async function ingestScrapeRun(scrapeRunId: string): Promise<IngestResult> {
  const supabase = createAdminClient();

  const { data: run, error: runError } = await supabase
    .from("scrape_runs")
    .select("*")
    .eq("id", scrapeRunId)
    .single();
  if (runError || !run) throw new Error(`scrape_run ${scrapeRunId} não encontrada: ${runError?.message}`);
  if (!run.apify_dataset_id) throw new Error(`scrape_run ${scrapeRunId} sem apify_dataset_id`);

  const items = await fetchDatasetItems(run.apify_dataset_id);
  const extracted = items.map((item) => extractGoogleMapsLead(item)).filter((x): x is NonNullable<typeof x> => !!x);

  const externalIds = extracted.map((e) => e.externalId);
  const { data: existingLeads } = await supabase
    .from("leads")
    .select("id, external_id")
    .eq("source", run.source)
    .in("external_id", externalIds.length > 0 ? externalIds : ["__none__"]);

  const existingByExternalId = new Map((existingLeads ?? []).map((l) => [l.external_id, l.id]));

  let imported = 0;
  let deduped = 0;

  for (const lead of extracted) {
    const isExisting = existingByExternalId.has(lead.externalId);
    if (isExisting) deduped += 1;
    else imported += 1;

    const scoreResult = computeScore(toScoreInputs(lead.signals));

    const { data: upsertedLead, error: upsertError } = await supabase
      .from("leads")
      .upsert(
        {
          scrape_run_id: scrapeRunId,
          source: run.source,
          external_id: lead.externalId,
          name: lead.name,
          category: lead.category,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          lat: lead.lat,
          lng: lead.lng,
          phone: lead.phone,
          website_url: lead.websiteUrl,
          google_maps_url: lead.googleMapsUrl,
          google_rating: lead.googleRating,
          google_reviews_count: lead.googleReviewsCount,
          raw_payload: lead as unknown as Record<string, unknown>,
          score: scoreResult.score,
          score_breakdown: scoreResult.breakdown,
          scored_at: new Date().toISOString(),
        },
        { onConflict: "source,external_id" }
      )
      .select("id")
      .single();

    if (upsertError || !upsertedLead) {
      console.error(`[ingest] falha ao upsert lead ${lead.externalId}:`, upsertError?.message);
      continue;
    }

    const leadId = (upsertedLead as Pick<Lead, "id">).id;

    const signalRows = lead.signals.map((s) => ({
      lead_id: leadId,
      signal_key: s.signal_key,
      value: s.value,
      confidence: s.confidence,
      source: run.source,
      detail: s.confidence === "nao_verificavel" ? "Não observável nesta fonte/execução" : null,
    }));

    const { error: signalsError } = await supabase
      .from("lead_signals")
      .upsert(signalRows, { onConflict: "lead_id,signal_key" });
    if (signalsError) console.error(`[ingest] falha ao gravar sinais do lead ${leadId}:`, signalsError.message);
  }

  await supabase
    .from("scrape_runs")
    .update({
      status: "succeeded",
      finished_at: new Date().toISOString(),
      items_found: items.length,
      items_imported: imported,
      items_deduped: deduped,
    })
    .eq("id", scrapeRunId);

  return { found: items.length, imported, deduped };
}
