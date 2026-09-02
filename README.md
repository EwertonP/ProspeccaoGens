# Motor de Prospecção B2B

Projeto separado (não faz parte do `plataforma-agencia`) que automatiza a geração de demanda da agência: coleta leads no Google Maps via Apify, qualifica com sinais objetivos, gera uma lista filtrável, e apoia a prospecção manual (WhatsApp/Instagram) e automatizada (e-mail via Resend). Leads que o time decide levar adiante são promovidos pro Kanban **"🎯 Leads Qualificados"** dentro do workspace do Notion da agência (Hub Central).

Plano completo (arquitetura, schema, decisões) em `C:\Users\Ewerton Monteiro\.claude\plans\eu-tenho-um-projeto-dapper-liskov.md`.

## Stack

Next.js 15 (App Router, TS) + Supabase (projeto próprio, separado do `plataforma-agencia`) + Vercel. Ferramenta interna de tenant único -- um papel só, sem multi-tenant.

## Setup

### 1. Supabase

1. Crie um projeto novo no [Supabase](https://supabase.com) (não reaproveite o do `plataforma-agencia` -- os domínios de dados são diferentes).
2. Rode as migrations em `supabase/migrations/` na ordem (001, depois 002) -- via SQL Editor do dashboard ou `supabase db push` com a CLI.
3. Crie um usuário (Authentication → Users → Add user) pra logar no app -- não há signup público.
4. Copie `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` (Settings → API) pro `.env.local`.

### 2. Apify (coleta Google Maps)

1. Crie uma conta em [apify.com](https://apify.com) e gere um token de API (Settings → Integrations).
2. Copie pra `APIFY_TOKEN`.
3. Gere uma string aleatória qualquer pra `APIFY_WEBHOOK_SECRET` (protege o endpoint que o Apify chama de volta).
4. Custo: ator `compass/crawler-google-places`, pay-per-event (~US$0,004/local raspado no tier gratuito). Ver detalhes de preço no próprio Apify Store antes de rodar coletas grandes.

### 3. Resend (e-mail automatizado)

1. Adicione seu domínio em [resend.com/domains](https://resend.com/domains).
2. Configure os registros SPF/DKIM/DMARC indicados no DNS do domínio.
3. Aguarde o status "Verified" (pode levar algumas horas).
4. Copie a API key pra `RESEND_API_KEY` e defina `RESEND_FROM_EMAIL` (ex: `Agência <contato@seudominio.com>`).
5. Gere uma string aleatória pra `EMAIL_UNSUBSCRIBE_SECRET`.

Até o domínio estar verificado, o envio de e-mail funciona em modo no-op (loga aviso, não quebra a rota).

### 4. Notion (Kanban de Leads Qualificados)

1. Crie a base de dados **"🎯 Leads Qualificados"** dentro da página **"🏢 Hub Central — Agência de Marketing"** no Notion, com as colunas listadas no plano (Negócio, Etapa, Origem, Categoria, Cidade, Score, Tem Site, Roda Tráfego Pago, Posta Regularmente, Avaliação Google, Telefone, WhatsApp, Instagram, Website, Link Google Maps, Responsável, Notas Internas, Data do Último Contato, Link no App, ID do Lead (App)).
2. Crie uma integração interna em [notion.so/my-integrations](https://www.notion.so/my-integrations) ("New integration").
3. Copie o token secreto pra `NOTION_API_KEY`.
4. Abra a base "Leads Qualificados" no Notion → "•••" (canto superior direito) → "Conexões" → adicione a integração criada. **Sem esse passo a API do Notion recusa todo acesso à base.**
5. Copie o ID da base (na URL, o trecho de 32 caracteres antes do `?`) pra `NOTION_LEADS_DATABASE_ID`.

### 5. Agendamento e nome da agência

- `NEXT_PUBLIC_SCHEDULING_LINK`: link do Calendly ou Cal.com usado como CTA nos e-mails.
- `NEXT_PUBLIC_AGENCY_NAME`: usado no rodapé LGPD dos e-mails automatizados.

### 6. Rodando local

```bash
npm install
cp .env.example .env.local   # preencha as variáveis acima
npm run dev
```

## Estrutura

- `lib/apify.ts` -- dispara runs do Google Maps Scraper (falha explícita sem token).
- `lib/signals/google-maps.ts` -- extrai sinais de qualificação de cada item raspado; um sinal que a fonte não permite observar fica `nao_verificavel`, nunca `false`.
- `lib/scoring.ts` -- score 0-100 a partir dos sinais observáveis (sinais `nao_verificavel` não entram no cálculo).
- `lib/ingest.ts` -- upsert de leads + sinais + score a partir do dataset do Apify (chamado pelo webhook e pelo cron de rede de segurança).
- `lib/notion-bridge/` -- promove leads qualificados pro Kanban do Notion (idempotente).
- `lib/email/resend.ts`, `lib/whatsapp.ts`, `lib/enrichment.ts`, `lib/unsubscribe.ts` -- outreach.
- `app/(app)/runs`, `app/(app)/leads`, `app/(app)/settings` -- telas.

## Deploy

Vercel, mesmo padrão dos outros projetos da agência. `vercel.json` já inclui o cron de `poll-scrape-runs` a cada 15 minutos.
