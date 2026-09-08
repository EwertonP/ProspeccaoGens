# Design system

Inspirado no Garimpo Leads (`garimpoleads.com.br`) — dark theme com acento âmbar,
badges coloridos por status/força, avatar por inicial. **Toda tela nova deve seguir
este documento e reusar `components/ui.tsx` / `components/Sidebar.tsx` em vez de
estilizar ad-hoc.**

## Tokens (`app/globals.css`)

Tema único (sem light mode — ferramenta interna). Tokens em `--color-*`, expostos
como utilities Tailwind (`bg-background`, `text-foreground`, `border-border` etc.):

| Token | Valor | Uso |
|---|---|---|
| `background` | `#0b0a08` | fundo da página |
| `surface` | `#17130e` | fundo de cards/sidebar/inputs escuros |
| `surface-hover` | `#1f1a13` | hover de linha/item de lista |
| `border` | `#2a2419` | bordas sutis |
| `foreground` | `#f3ede2` | texto principal |
| `muted` | `#a89a83` | texto secundário/label |
| `accent` | `#f5820c` | cor de ação única (botão primário, link ativo, foco) |
| `accent-hover` | `#dd6f04` | hover do accent |
| `accent-foreground` | `#1a1006` | texto sobre fundo accent |

Cores semânticas de status/força usam a paleta padrão do Tailwind (não são tokens
próprios): `emerald` (sucesso/forte), `amber` (atenção/moderado), `rose`
(erro/fraco), `sky` (informativo/em andamento), `white/5` (neutro).

## Componentes (`components/ui.tsx`)

- `Badge` / `ScoreBadge` / `LeadStatusBadge` / `RunStatusBadge` / `ConfidenceBadge`
  — pill arredondado, uppercase, cor semântica. Nunca inventar uma cor de badge
  fora das tonalidades (`neutral`, `accent`, `emerald`, `amber`, `rose`, `sky`).
- `scoreTier(score)` — mapeia score 0-100 pra faixa (`Muito forte` ≥80,
  `Forte` ≥60, `Moderado` ≥40, `Fraco` <40, `Sem dados` se `null`). Um score
  `null` nunca vira "Fraco".
- `Avatar` — círculo colorido por hash do nome (`avatarColor`), com a inicial.
  Usar em toda listagem de leads/contatos.
- `Card` / `CardTitle` — container padrão (`rounded-xl border border-border
  bg-surface p-5`) pra qualquer bloco de conteúdo.
- `Button` (variants `primary`/`secondary`/`ghost`) e `LinkButton` (mesmo visual
  em `<a>`) — sempre usar em vez de `<button>`/`<a>` cru.
- `Input`, `Select`, `Label` — campos de formulário com foco em `accent`.

## Layout (`components/Sidebar.tsx`)

Sidebar fixa à esquerda (ícone + label), item ativo com barra lateral `accent` e
fundo `accent/10`. Sair fica no rodapé da sidebar. Área de conteúdo com
`px-8 py-8` sobre `bg-background`. Login/signup usam um card centralizado
(`max-w-sm`, `bg-surface`, `border-border`) fora da sidebar.

## Regras pra telas novas

1. Nunca usar `neutral-*`, `white`, cinzas do Tailwind default pra fundo/texto —
   sempre os tokens (`bg-surface`, `text-foreground`, `text-muted`).
2. Toda listagem tabular usa `Avatar` pro item principal e badges coloridos pro
   status/score — não texto puro ou emoji solto.
3. Toda ação primária (submit, promover, disparar) usa `Button variant="primary"`
   (accent); ações secundárias usam `variant="secondary"`.
4. Erros inline usam `border-rose-500/30 bg-rose-500/10 text-rose-400`; sucesso
   usa `border-accent/30 bg-accent/10 text-accent` ou `emerald` quando fizer mais
   sentido semanticamente (ex: "já promovido").
5. Não introduzir uma biblioteca de componentes (shadcn, MUI etc.) sem discutir —
   o padrão aqui é Tailwind puro + `components/ui.tsx`.
