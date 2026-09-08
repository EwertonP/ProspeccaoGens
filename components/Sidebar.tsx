"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/app/(app)/SignOutButton";

// Shell de navegação do app -- sidebar fixa e enxuta (ícone + label, item
// ativo com barra lateral de acento), espelhando o padrão do Garimpo Leads
// documentado em DESIGN_SYSTEM.md. Substitui o header horizontal antigo.

const NAV = [
  { href: "/campaigns", label: "Campanhas", icon: TargetIcon },
  { href: "/leads", label: "Leads", icon: UsersIcon },
  { href: "/settings", label: "Configurações", icon: GearIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="text-lg">⛏️</span>
        <span className="font-semibold tracking-tight text-foreground">Prospecção B2B</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-transparent text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <SignOutButton />
      </div>
    </aside>
  );
}

function iconProps() {
  return { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;
}

function TargetIcon(): ReactNode {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

function UsersIcon(): ReactNode {
  return (
    <svg {...iconProps()}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <path d="M16 8a3 3 0 1 1 0 6" />
      <path d="M15 14c2.8.4 5 2.8 5 6" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon(): ReactNode {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
