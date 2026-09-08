import { sql } from "./db";
import { startGoogleMapsRun, ApifyCredentialsError, type GoogleMapsSearchInput } from "./apify";
import type { ScrapeRun } from "./types";

export interface CreateRunParams extends GoogleMapsSearchInput {
  appUrl: string;
}

// Cria a linha em scrape_runs e dispara o run no Apify -- usado tanto pela
// coleta manual (app/api/scrape-runs/route.ts) quanto pela criação de
// campanha (app/api/campaigns/route.ts), pra não duplicar o tratamento de
// erro/webhook entre as duas rotas.
export async function createAndStartRun(params: CreateRunParams, campaignId: string | null = null): Promise<ScrapeRun> {
  const { appUrl, ...searchInput } = params;

  const [run] = await sql`
    insert into scrape_runs (source, status, search_params, campaign_id)
    values ('google_maps', 'queued', ${JSON.stringify(searchInput)}, ${campaignId})
    returning *
  `;

  const webhookUrl = `${appUrl}/api/scrape-runs/apify-webhook?secret=${process.env.APIFY_WEBHOOK_SECRET ?? ""}`;

  try {
    const { apifyRunId, datasetId } = await startGoogleMapsRun(searchInput, webhookUrl);

    const [updatedRun] = await sql`
      update scrape_runs set status = 'running', apify_run_id = ${apifyRunId}, apify_dataset_id = ${datasetId}, started_at = now()
      where id = ${run.id}
      returning *
    `;

    return updatedRun as unknown as ScrapeRun;
  } catch (err) {
    const message = err instanceof ApifyCredentialsError ? err.message : "Falha ao disparar o run no Apify";
    const [failedRun] = await sql`update scrape_runs set status = 'failed', error_message = ${message} where id = ${run.id} returning *`;
    throw Object.assign(new Error(message), { run: failedRun, isCredentialsError: err instanceof ApifyCredentialsError });
  }
}
