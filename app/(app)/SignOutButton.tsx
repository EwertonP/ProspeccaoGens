"use client";

import { signOutAction } from "@/app/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground">
        Sair
      </button>
    </form>
  );
}
