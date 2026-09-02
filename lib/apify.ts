import { ApifyClient } from "apify-client";

// Padrão de falha explícita (não silencioso como lib/email/resend.ts) --
// disparar um scrape é uma ação deliberada, deve falhar visivelmente sem
// token configurado. Mesmo princípio de lib/meta-api/index.ts do
// plataforma-agencia, adaptado pra Apify.
export class ApifyCredentialsError extends Error {
  constructor(message = "APIFY_TOKEN não configurada") {
    super(message);
    this.name = "ApifyCredentialsError";
  }
}

let client: ApifyClient | null = null;

function getClient(): ApifyClient {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new ApifyCredentialsError();
  if (!client) client = new ApifyClient({ token });
  return client;
}

export const GOOGLE_MAPS_ACTOR_ID = "compass/crawler-google-places";

export interface GoogleMapsSearchInput {
  searchStringsArray: string[];
  locationQuery?: string;
  city?: string;
  state?: string;
  countryCode?: string;
  maxCrawledPlacesPerSearch?: number;
  maxReviews?: number;
  maxImages?: number;
}

export interface StartRunResult {
  apifyRunId: string;
  datasetId: string;
}

// Dispara o run e retorna na hora -- NUNCA usar client.actor(...).call()
// (bloqueante) numa rota serverless da Vercel: um run de Google Maps leva
// minutos, estouraria o timeout da function. O resultado chega via webhook
// (ver app/api/scrape-runs/apify-webhook/route.ts).
export async function startGoogleMapsRun(
  input: GoogleMapsSearchInput,
  webhookUrl: string
): Promise<StartRunResult> {
  const apify = getClient();

  const run = await apify.actor(GOOGLE_MAPS_ACTOR_ID).start(
    {
      searchStringsArray: input.searchStringsArray,
      locationQuery: input.locationQuery,
      city: input.city,
      state: input.state,
      countryCode: input.countryCode,
      maxCrawledPlacesPerSearch: input.maxCrawledPlacesPerSearch ?? 50,
      language: "pt-BR",
      maxReviews: input.maxReviews ?? 5,
      maxImages: input.maxImages ?? 0,
      skipClosedPlaces: true,
    },
    {
      webhooks: [
        {
          eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.ABORTED", "ACTOR.RUN.TIMED_OUT"],
          requestUrl: webhookUrl,
        },
      ],
    }
  );

  return { apifyRunId: run.id, datasetId: run.defaultDatasetId };
}

export async function fetchDatasetItems(datasetId: string): Promise<Record<string, unknown>[]> {
  const apify = getClient();
  const { items } = await apify.dataset(datasetId).listItems();
  return items as Record<string, unknown>[];
}

export async function getRun(apifyRunId: string) {
  const apify = getClient();
  return apify.run(apifyRunId).get();
}
