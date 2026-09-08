import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

// Padrão de falha explícita (igual lib/apify.ts) -- criar uma campanha é
// ação deliberada do usuário, deve falhar visivelmente sem nenhuma chave
// de IA configurada.
export class AiCredentialsError extends Error {
  constructor(message = "Nenhuma chave de IA configurada -- defina ANTHROPIC_API_KEY ou GEMINI_API_KEY") {
    super(message);
    this.name = "AiCredentialsError";
  }
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

// Qual provedor usar: AI_PROVIDER força a escolha ("anthropic" | "gemini");
// sem isso, detecta automaticamente pela primeira chave presente (Claude
// tem prioridade se as duas estiverem configuradas). Mesmo princípio de
// "falha explícita, nunca chutado" -- se nenhuma chave existe, erro claro
// listando as duas opções em vez de tentar uma silenciosamente.
type AiProvider = "anthropic" | "gemini";

function resolveProvider(): AiProvider {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === "anthropic" || explicit === "gemini") return explicit;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  throw new AiCredentialsError();
}

function buildUserMessage(brief: CampaignBrief): string {
  return [
    `O que a empresa vende: ${brief.productPitch}`,
    `Quem costuma fechar negócio: ${brief.buyerPersona}`,
    brief.problemSolved ? `Problema que resolve: ${brief.problemSolved}` : null,
    brief.locationQuery ? `Onde buscar: ${brief.locationQuery}` : "Onde buscar: não informado",
    brief.existingCustomers ? `Exemplos de clientes que já fecharam: ${brief.existingCustomers}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function callAnthropic(userMessage: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiCredentialsError("ANTHROPIC_API_KEY não configurada");

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  return response.content.find((block) => block.type === "text")?.text ?? "{}";
}

async function callGemini(userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiCredentialsError("GEMINI_API_KEY não configurada");

  const gemini = new GoogleGenAI({ apiKey });
  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userMessage,
    config: { systemInstruction: SYSTEM_PROMPT },
  });

  return response.text ?? "{}";
}

// Única chamada de LLM por campanha (não por lead) -- pega as respostas do
// briefing em 5 perguntas e devolve nome + termos de busca + localização
// prontos pra alimentar lib/apify.ts::startGoogleMapsRun via
// lib/scrape-runs.ts::createAndStartRun.
export async function deriveCampaignPlan(brief: CampaignBrief): Promise<CampaignPlan> {
  const provider = resolveProvider();
  const userMessage = buildUserMessage(brief);
  const text = provider === "anthropic" ? await callAnthropic(userMessage) : await callGemini(userMessage);

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
