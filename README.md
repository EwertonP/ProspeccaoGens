# Motor de Prospecção B2B

Projeto separado (não faz parte do `plataforma-agencia`) que automatiza a geração de demanda da agência: coleta leads no Google Maps via Apify, qualifica com sinais objetivos, gera uma lista filtrável, e apoia a prospecção manual (WhatsApp/Instagram) e automatizada (e-mail via Resend). Leads que o time decide levar adiante são promovidos pro Kanban **"🎯 Leads Qualificados"** dentro do workspace do Notion da agência (Hub Central).

Plano completo (arquitetura, schema, decisões) em `C:\Users\Ewerton Monteiro\.claude\plans\eu-tenho-um-projeto-dapper-liskov.md`.

## Stack

Next.js 16 (App Router, TS) + Neon (Postgres + Managed Better Auth) + Vercel. Ferramenta interna de tenant único -- um papel só, sem multi-tenant.

## Setup

### 1. Neon

Projeto já criado (`ProspeccaoGens`, org "Agência GENS") e linkado via `neon link` (gera `.neon/` e `.env.local` automaticamente). Pra reconfigurar do zero:

1. `npm i -g neon@latest && neon login`
2. `neon link --project-id small-haze-74844193 --branch production` (dentro da pasta do projeto) -- popula `DATABASE_URL`, `NEON_AUTH_BASE_URL` etc. em `.env.local`.
3. Rode as migrations em `supabase/migrations/` (o nome da pasta ficou do scaffold original, mas é Postgres puro agora) -- `neon psql --role-name neondb_owner -- -f supabase/migrations/001_schema.sql`.
4. Gere `NEON_AUTH_COOKIE_SECRET` (32+ caracteres): `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
5. Crie sua conta acessando `/signup` uma vez (sem link visível no login, de propósito -- é só pra criar a conta da equipe).

### 2. Anthropic (IA do wizard de campanha)

1. Crie uma chave em [console.anthropic.com](https://console.anthropic.com/settings/keys).
2. Copie pra `ANTHROPIC_API_KEY`.
3. Uso: 1 chamada por campanha criada em `/campaigns/new` (traduz o briefing em termos de busca), nunca por lead.

### 3. Apify (coleta Google Maps)

1. Crie uma conta em [apify.com](https://apify.com) e gere um token de API (Settings → Integrations).
2. Copie pra `APIFY_TOKEN`.
3. Gere uma string aleatória qualquer pra `APIFY_WEBHOOK_SECRET` (protege o endpoint que o Apify chama de volta).
4. Custo: ator `compass/crawler-google-places`, pay-per-event (~US$0,004/local raspado no tier gratuito). Ver detalhes de preço no próprio Apify Store antes de rodar coletas grandes.

### 4. Resend (e-mail automatizado)

1. Adicione seu domínio em [resend.com/domains](https://resend.com/domains).
2. Configure os registros SPF/DKIM/DMARC indicados no DNS do domínio.
3. Aguarde o status "Verified" (pode levar algumas horas).
4. Copie a API key pra `RESEND_API_KEY` e defina `RESEND_FROM_EMAIL` (ex: `Agência <contato@seudominio.com>`).
5. Gere uma string aleatória pra `EMAIL_UNSUBSCRIBE_SECRET`.

Até o domínio estar verificado, o envio de e-mail funciona em modo no-op (loga aviso, não quebra a rota).

### 5. Notion (Kanban de Leads Qualificados)

1. Crie a base de dados **"🎯 Leads Qualificados"** dentro da página **"🏢 Hub Central — Agência de Marketing"** no Notion, com as colunas listadas no plano (Negócio, Etapa, Origem, Categoria, Cidade, Score, Tem Site, Roda Tráfego Pago, Posta Regularmente, Avaliação Google, Telefone, WhatsApp, Instagram, Website, Link Google Maps, Responsável, Notas Internas, Data do Último Contato, Link no App, ID do Lead (App)).
2. Crie uma integração interna em [notion.so/my-integrations](https://www.notion.so/my-integrations) ("New integration").
3. Copie o token secreto pra `NOTION_API_KEY`.
4. Abra a base "Leads Qualificados" no Notion → "•••" (canto superior direito) → "Conexões" → adicione a integração criada. **Sem esse passo a API do Notion recusa todo acesso à base.**
5. Copie o ID da base (na URL, o trecho de 32 caracteres antes do `?`) pra `NOTION_LEADS_DATABASE_ID`.

### 6. Agendamento e nome da agência

- `NEXT_PUBLIC_SCHEDULING_LINK`: link do Calendly ou Cal.com usado como CTA nos e-mails.
- `NEXT_PUBLIC_AGENCY_NAME`: usado no rodapé LGPD dos e-mails automatizados.

### 7. Rodando local

```bash
npm install
cp .env.example .env.local   # preencha as variáveis acima
npm run dev
```

## Design

Dark theme com acento âmbar, inspirado no Garimpo Leads — tokens, componentes e
regras pra telas novas em [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).

## Estrutura

- `lib/ai/campaign-brief.ts` -- 1 chamada à IA (Claude) por campanha criada, traduz o briefing do wizard em termos de busca (nunca por lead).
- `lib/scrape-runs.ts` -- cria a linha em `scrape_runs` e dispara o Apify; compartilhado pela coleta manual e pela criação de campanha.
- `lib/apify.ts` -- dispara runs do Google Maps Scraper (falha explícita sem token).
- `lib/signals/google-maps.ts` -- extrai sinais de qualificação de cada item raspado; um sinal que a fonte não permite observar fica `nao_verificavel`, nunca `false`.
- `lib/scoring.ts` -- score 0-100 a partir dos sinais observáveis (sinais `nao_verificavel` não entram no cálculo).
- `lib/ingest.ts` -- upsert de leads + sinais + score a partir do dataset do Apify (chamado pelo webhook e pelo cron de rede de segurança).
- `lib/notion-bridge/` -- promove leads qualificados pro Kanban do Notion (idempotente).
- `lib/email/resend.ts`, `lib/whatsapp.ts`, `lib/enrichment.ts`, `lib/unsubscribe.ts` -- outreach.
- `app/(app)/campaigns`, `app/(app)/campaigns/new` -- criação de campanha via briefing (substitui o formulário técnico como ponto de entrada principal).
- `app/(app)/runs` -- histórico técnico de execuções no Apify (acessível a partir de `/campaigns`, sem link na sidebar principal).
- `app/(app)/leads`, `app/(app)/settings` -- telas.

## Deploy

Vercel, mesmo padrão dos outros projetos da agência. `vercel.json` já inclui o cron de `poll-scrape-runs` 1x por dia (limite do plano Hobby da Vercel -- num plano pago dá pra rodar com mais frequência).
