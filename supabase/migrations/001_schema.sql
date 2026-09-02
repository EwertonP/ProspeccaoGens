-- 001_schema.sql
-- Motor de Prospecção B2B -- coleta (Apify), qualificação e outreach.
-- Projeto de tenant único (ferramenta interna da agência) -- sem client_id.

create table scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'google_maps' check (source in ('google_maps', 'instagram', 'linkedin')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'partial')),
  apify_actor_id text not null default 'compass/crawler-google-places',
  apify_run_id text,
  apify_dataset_id text,
  search_params jsonb not null,
  started_at timestamptz,
  finished_at timestamptz,
  items_found integer,
  items_imported integer,
  items_deduped integer,
  error_message text,
  triggered_by uuid,
  created_at timestamptz not null default now()
);

-- =========================================================
-- leads: sinais de qualificação NÃO são colunas fixas aqui -- vão em
-- lead_signals (chave/valor + confiança explícita), pra sinais futuros
-- (Instagram, LinkedIn, tráfego pago real) entrarem sem migração de banco.
-- =========================================================
create table leads (
  id uuid primary key default gen_random_uuid(),
  scrape_run_id uuid references scrape_runs(id) on delete set null,
  source text not null default 'google_maps' check (source in ('google_maps', 'instagram', 'linkedin')),
  external_id text not null,
  name text not null,
  category text,
  address text,
  city text,
  state text,
  lat numeric,
  lng numeric,
  phone text,
  whatsapp_phone text,
  website_url text,
  instagram_handle text,
  email text,
  google_rating numeric,
  google_reviews_count integer,
  google_maps_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  score integer,
  score_breakdown jsonb,
  scored_at timestamptz,
  status text not null default 'novo' check (status in ('novo', 'qualificado', 'descartado', 'contatado', 'promovido')),
  email_opt_out boolean not null default false,
  promoted_notion_page_id text,
  promoted_at timestamptz,
  enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create index idx_leads_score on leads (score desc nulls last);
create index idx_leads_status on leads (status);
create index idx_leads_scrape_run_id on leads (scrape_run_id);

-- =========================================================
-- lead_signals: sinais de qualificação normalizados -- extensível sem
-- migração futura. value=null + confidence='nao_verificavel' é o estado
-- "não dá pra saber pela fonte atual" -- nunca vira 'false' por omissão.
-- =========================================================
create table lead_signals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  signal_key text not null,
  value boolean,
  confidence text not null check (confidence in ('observado', 'inferido', 'nao_verificavel')),
  source text not null,
  detail text,
  detected_at timestamptz not null default now(),
  unique (lead_id, signal_key)
);

create index idx_lead_signals_lead_id on lead_signals (lead_id);

create table lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'instagram', 'email', 'nota', 'ligacao')),
  type text not null check (type in ('mensagem_enviada', 'resposta_recebida', 'reuniao_agendada', 'nota', 'erro_envio')),
  body text,
  template_used text,
  email_id text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index idx_lead_activities_lead_id on lead_activities (lead_id);

create table message_templates (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('whatsapp', 'instagram', 'email')),
  name text not null,
  subject text,
  body text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
