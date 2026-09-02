-- 002_rls.sql
-- Projeto de tenant único (ferramenta interna) -- policy simples
-- authenticated-only em todas as tabelas, sem client_id/role.

alter table scrape_runs enable row level security;
alter table leads enable row level security;
alter table lead_signals enable row level security;
alter table lead_activities enable row level security;
alter table message_templates enable row level security;

create policy "authenticated_full_access" on scrape_runs
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on leads
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on lead_signals
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on lead_activities
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on message_templates
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
