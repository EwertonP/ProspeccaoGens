import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from "react";
import type { LeadStatus, ScrapeRunStatus, SignalConfidence } from "@/lib/types";

// Primitivas de UI compartilhadas por todas as telas do app -- espelham o
// design system "Garimpo" documentado em DESIGN_SYSTEM.md (dark theme,
// acento âmbar, badges coloridos por status/força, avatar por inicial).
// Toda tela nova deve montar a partir daqui em vez de estilizar ad-hoc.

// --- Badges de status/força -------------------------------------------------

type Tone = "neutral" | "accent" | "emerald" | "amber" | "rose" | "sky";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-white/5 text-muted",
  accent: "bg-accent/15 text-accent",
  emerald: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-500/15 text-amber-400",
  rose: "bg-rose-500/15 text-rose-400",
  sky: "bg-sky-500/15 text-sky-400",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}

// Faixas de força do lead a partir do score 0-100. score === null (sem
// sinais verificáveis ainda) é "Sem dados" -- nunca tratado como fraco.
export function scoreTier(score: number | null): { label: string; tone: Tone } {
  if (score === null) return { label: "Sem dados", tone: "neutral" };
  if (score >= 80) return { label: "Muito forte", tone: "emerald" };
  if (score >= 60) return { label: "Forte", tone: "accent" };
  if (score >= 40) return { label: "Moderado", tone: "amber" };
  return { label: "Fraco", tone: "rose" };
}

export function ScoreBadge({ score }: { score: number | null }) {
  const { label, tone } = scoreTier(score);
  return <Badge tone={tone}>{label}</Badge>;
}

const LEAD_STATUS: Record<LeadStatus, { label: string; tone: Tone }> = {
  novo: { label: "Novo", tone: "sky" },
  qualificado: { label: "Qualificado", tone: "emerald" },
  contatado: { label: "Contatado", tone: "amber" },
  descartado: { label: "Descartado", tone: "neutral" },
  promovido: { label: "No Notion", tone: "accent" },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { label, tone } = LEAD_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const RUN_STATUS: Record<ScrapeRunStatus, { label: string; tone: Tone }> = {
  queued: { label: "Na fila", tone: "neutral" },
  running: { label: "Rodando", tone: "sky" },
  succeeded: { label: "Concluída", tone: "emerald" },
  failed: { label: "Falhou", tone: "rose" },
  partial: { label: "Parcial", tone: "amber" },
};

export function RunStatusBadge({ status }: { status: ScrapeRunStatus }) {
  const { label, tone } = RUN_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const CONFIDENCE: Record<SignalConfidence, Tone> = {
  observado: "emerald",
  inferido: "amber",
  nao_verificavel: "neutral",
};

export function ConfidenceBadge({ confidence, children }: { confidence: SignalConfidence; children: ReactNode }) {
  return <Badge tone={CONFIDENCE[confidence]}>{children}</Badge>;
}

// --- Avatar por inicial ------------------------------------------------------

const AVATAR_HUES = [10, 25, 145, 200, 260, 320, 340, 45];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = AVATAR_HUES[hash % AVATAR_HUES.length];
  return `hsl(${hue} 70% 45%)`;
}

export function Avatar({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: avatarColor(name) }}
    >
      {letter}
    </span>
  );
}

// --- Layout ------------------------------------------------------------------

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-border bg-surface p-5 ${className}`}>{children}</section>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold text-foreground">{children}</h2>;
}

// --- Form ----------------------------------------------------------------

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-muted">{children}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={`rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
    />
  );
}

// --- Botões ------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-40",
  secondary: "border border-border bg-surface text-foreground hover:bg-surface-hover disabled:opacity-40",
  ghost: "text-muted hover:text-foreground disabled:opacity-40",
};

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...rest}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${BUTTON_VARIANT[variant]} ${className}`}
    />
  );
}

export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
  target,
  onClick,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
  target?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      target={target}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${BUTTON_VARIANT[variant]} ${className}`}
    >
      {children}
    </a>
  );
}
