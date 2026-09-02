// Tipos compartilhados do domínio -- espelham supabase/migrations/001_schema.sql.

export type ScrapeSource = "google_maps" | "instagram" | "linkedin";
export type ScrapeRunStatus = "queued" | "running" | "succeeded" | "failed" | "partial";
export type LeadStatus = "novo" | "qualificado" | "descartado" | "contatado" | "promovido";
export type SignalConfidence = "observado" | "inferido" | "nao_verificavel";
export type ActivityChannel = "whatsapp" | "instagram" | "email" | "nota" | "ligacao";
export type ActivityType = "mensagem_enviada" | "resposta_recebida" | "reuniao_agendada" | "nota" | "erro_envio";
export type TemplateChannel = "whatsapp" | "instagram" | "email";

export interface ScrapeRun {
  id: string;
  source: ScrapeSource;
  status: ScrapeRunStatus;
  apify_actor_id: string;
  apify_run_id: string | null;
  apify_dataset_id: string | null;
  search_params: Record<string, unknown>;
  started_at: string | null;
  finished_at: string | null;
  items_found: number | null;
  items_imported: number | null;
  items_deduped: number | null;
  error_message: string | null;
  triggered_by: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  scrape_run_id: string | null;
  source: ScrapeSource;
  external_id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  whatsapp_phone: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  email: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  google_maps_url: string | null;
  raw_payload: Record<string, unknown>;
  score: number | null;
  score_breakdown: ScoreBreakdownEntry[] | null;
  scored_at: string | null;
  status: LeadStatus;
  email_opt_out: boolean;
  promoted_notion_page_id: string | null;
  promoted_at: string | null;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadSignal {
  id: string;
  lead_id: string;
  signal_key: string;
  value: boolean | null;
  confidence: SignalConfidence;
  source: string;
  detail: string | null;
  detected_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  channel: ActivityChannel;
  type: ActivityType;
  body: string | null;
  template_used: string | null;
  email_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  channel: TemplateChannel;
  name: string;
  subject: string | null;
  body: string;
  is_default: boolean;
  created_at: string;
}

export interface ScoreBreakdownEntry {
  signal_key: string;
  value: boolean | null;
  confidence: SignalConfidence;
  weight: number;
  points: number;
  counted: boolean;
}
