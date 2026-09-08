import Anthropic from "@anthropic-ai/sdk";

// Padrão de falha explícita (igual lib/apify.ts) -- criar uma campanha é
// ação deliberada do usuário, deve falhar visivelmente sem chave configurada.
export class AnthropicCredentialsError extends Error {
  constructor(message = "ANTHROPIC_API_KEY não configurada") {
    super(message);
    this.name = "AnthropicCredentialsError";
  }
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AnthropicCredentialsError();
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export interface CampaignBrief {
  productPitch: string;
  buyerPersona: string;
  problemSolved?: string;
  locationQuery?: string;
  existingCustomers?: string;
}

export interface CampaignPlan {
  name: string;
  searchTerms: string[];
  locationQuery: string | null;
}

const SYSTEM_PROMPT = `Você traduz o briefing de um vendedor B2B em uma estratégia de busca no Google Maps.
Responda APENAS com um JSON no formato exato:
{"name": "nome curto da campanha (até 6 palavras)", "searchTerms": ["termo de busca 1", "termo de busca 2"], "locationQuery": "cidade/estado/região ou null"}

Regras:
- searchTerms: 1 a 3 termos curtos, no estilo de categoria de negócio do Google Maps (ex: "clínica de dermatologia", "escritório de advocacia tributária"), nunca frases longas.
- locationQuery: use exatamente o que o usuário informou; se ele não informou local nenhum, use null (o app já assume Brasil inteiro nesse caso).
- name: descreve o público-alvo + região de forma sucinta, sem aspas.`;

// Única chamada de LLM por campanha (não por lead) -- pega as respostas do
// briefing em 5 perguntas e devolve nome + termos de busca + localização
// prontos pra alimentar lib/apify.ts::startGoogleMapsRun via
// lib/scrape-runs.ts::createAndStartRun.
export async function deriveCampaignPlan(brief: CampaignBrief): Promise<CampaignPlan> {
  const anthropic = getClient();

  const userMessage = [
    `O que a empresa vende: ${brief.productPitch}`,
    `Quem costuma fechar negócio: ${brief.buyerPersona}`,
    brief.problemSolved ? `Problema que resolve: ${brief.problemSolved}` : null,
    brief.locationQuery ? `Onde buscar: ${brief.locationQuery}` : "Onde buscar: não informado",
    brief.existingCustomers ? `Exemplos de clientes que já fecharam: ${brief.existingCustomers}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content.find((block) => block.type === "text")?.text ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Resposta da IA não trouxe um JSON válido");

  const parsed = JSON.parse(jsonMatch[0]) as { name?: string; searchTerms?: string[]; locationQuery?: string | null };

  if (!parsed.name || !Array.isArray(parsed.searchTerms) || parsed.searchTerms.length === 0) {
    throw new Error("Resposta da IA incompleta (faltou name ou searchTerms)");
  }

  return {
    name: parsed.name,
    searchTerms: parsed.searchTerms,
    locationQuery: parsed.locationQuery ?? brief.locationQuery ?? null,
  };
}
