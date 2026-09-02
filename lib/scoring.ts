import type { LeadSignal, SignalConfidence, ScoreBreakdownEntry } from "./types";

// Pesos vivem em código, não no banco -- lead_signals é uma tabela
// chave/valor extensível (ver supabase/migrations/001_schema.sql), então
// sinais futuros (Instagram, LinkedIn) só precisam de um peso reservado
// aqui, sem migração de banco.
export const SIGNAL_WEIGHTS: Record<string, number> = {
  has_phone: 10,
  has_website: 10,
  profile_complete: 10,
  google_rating_good: 10,
  recent_reviews: 15,
  owner_responds_reviews: 10,
  runs_paid_ads: 15,
  posts_regularly: 10, // reservado -- só populado quando Instagram/LinkedIn entrarem
  instagram_active: 10, // reservado
};

export interface ScoreInput {
  signal_key: string;
  value: boolean | null;
  confidence: SignalConfidence;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdownEntry[];
  earned: number;
  possible: number;
}

// Sinais 'nao_verificavel' (ou value null) NÃO entram no denominador --
// não penalizam nem inflam o score de um lead cuja fonte não permite
// observar tudo. "Nada é chutado": um sinal desconhecido é neutro, nunca
// tratado como negativo.
export function computeScore(signals: ScoreInput[]): ScoreResult {
  let earned = 0;
  let possible = 0;

  const breakdown: ScoreBreakdownEntry[] = signals.map((s) => {
    const weight = SIGNAL_WEIGHTS[s.signal_key] ?? 0;

    if (s.confidence === "nao_verificavel" || s.value === null) {
      return { signal_key: s.signal_key, value: s.value, confidence: s.confidence, weight, points: 0, counted: false };
    }

    possible += weight;
    const points = s.value ? weight : 0;
    earned += points;

    return { signal_key: s.signal_key, value: s.value, confidence: s.confidence, weight, points, counted: true };
  });

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  return { score, breakdown, earned, possible };
}

// Pequeno atalho pra converter LeadSignal[] (linhas do banco) em ScoreInput[].
export function toScoreInputs(signals: Pick<LeadSignal, "signal_key" | "value" | "confidence">[]): ScoreInput[] {
  return signals.map((s) => ({ signal_key: s.signal_key, value: s.value, confidence: s.confidence }));
}
