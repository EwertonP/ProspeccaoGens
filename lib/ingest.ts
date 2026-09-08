import { sql } from "./db";
import { fetchDatasetItems } from "./apify";
import { extractGoogleMapsLead } from "./signals/google-maps";
import { computeScore, toScoreInputs } from "./scoring";

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
  const [run] = await sql`select * from scrape_runs where id = ${scrapeRunId}`;
  if (!run) throw new Error(`scrape_run ${scrapeRunId} não encontrada`);
  if (!run.apify_dataset_id) throw new Error(`scrape_run ${scrapeRunId} sem apify_dataset_id`);

  const items = await fetchDatasetItems(run.apify_dataset_id as string);
  const extracted = items.map((item) => extractGoogleMapsLead(item)).filter((x): x is NonNullable<typeof x> => !!x);

  const externalIds = extracted.map((e) => e.externalId);
  const existingLeads =
    externalIds.length > 0
      ? await sql`select id, external_id from leads where source = ${run.source} and external_id = any(${externalIds})`
      : [];
  const existingByExternalId = new Map(existingLeads.map((l) => [l.external_id as string, l.id as string]));

  let imported = 0;
  let deduped = 0;

  for (const lead of extracted) {
    const isExisting = existingByExternalId.has(lead.externalId);
    if (isExisting) deduped += 1;
    else imported += 1;

    const scoreResult = computeScore(toScoreInputs(lead.signals));

    let leadId: string;
    try {
      const [upserted] = await sql`
        insert into leads (
          scrape_run_id, campaign_id, source, external_id, name, category, address, city, state, lat, lng,
          phone, website_url, google_maps_url, google_rating, google_reviews_count,
          raw_payload, score, score_breakdown, scored_at
        ) values (
          ${scrapeRunId}, ${run.campaign_id}, ${run.source}, ${lead.externalId}, ${lead.name}, ${lead.category}, ${lead.address},
          ${lead.city}, ${lead.state}, ${lead.lat}, ${lead.lng}, ${lead.phone}, ${lead.websiteUrl},
          ${lead.googleMapsUrl}, ${lead.googleRating}, ${lead.googleReviewsCount},
          ${JSON.stringify(lead)}, ${scoreResult.score}, ${JSON.stringify(scoreResult.breakdown)}, now()
        )
        on conflict (source, external_id) do update set
          scrape_run_id = excluded.scrape_run_id,
          campaign_id = excluded.campaign_id,
          name = excluded.name,
          category = excluded.category,
          address = excluded.address,
          city = excluded.city,
          state = excluded.state,
          lat = excluded.lat,
          lng = excluded.lng,
          phone = excluded.phone,
          website_url = excluded.website_url,
          google_maps_url = excluded.google_maps_url,
          google_rating = excluded.google_rating,
          google_reviews_count = excluded.google_reviews_count,
          raw_payload = excluded.raw_payload,
          score = excluded.score,
          score_breakdown = excluded.score_breakdown,
          scored_at = excluded.scored_at,
          updated_at = now()
        returning id
      `;
      leadId = upserted.id as string;
    } catch (err) {
      console.error(`[ingest] falha ao upsert lead ${lead.externalId}:`, err);
      continue;
    }

    for (const s of lead.signals) {
      const detail = s.confidence === "nao_verificavel" ? "Não observável nesta fonte/execução" : null;
      try {
        await sql`
          insert into lead_signals (lead_id, signal_key, value, confidence, source, detail)
          values (${leadId}, ${s.signal_key}, ${s.value}, ${s.confidence}, ${run.source}, ${detail})
          on conflict (lead_id, signal_key) do update set
            value = excluded.value, confidence = excluded.confidence, source = excluded.source,
            detail = excluded.detail, detected_at = now()
        `;
      } catch (err) {
        console.error(`[ingest] falha ao gravar sinal ${s.signal_key} do lead ${leadId}:`, err);
      }
    }
  }

  await sql`
    update scrape_runs set status = 'succeeded', finished_at = now(),
      items_found = ${items.length}, items_imported = ${imported}, items_deduped = ${deduped}
    where id = ${scrapeRunId}
  `;

  return { found: items.length, imported, deduped };
}
