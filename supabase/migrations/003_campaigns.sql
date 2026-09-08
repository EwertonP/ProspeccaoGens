-- Campanhas: agrupamento nomeado e persistente de leads, criado a partir de
-- um briefing conversacional (ver lib/ai/campaign-brief.ts). scrape_runs
-- continua sendo o log técnico de cada execução no Apify; campaigns é a
-- unidade de negócio que o time enxerga na UI.
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'ativa' check (status in ('ativa','pausada','concluida')),
  product_pitch text not null,
  buyer_persona text not null,
  problem_solved text,
  location_query text,
  existing_customers text,
  search_terms text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table scrape_runs add column campaign_id uuid references campaigns(id) on delete set null;
alter table leads add column campaign_id uuid references campaigns(id) on delete set null;
create index idx_leads_campaign on leads(campaign_id);
