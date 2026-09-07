"use client";

import { signOutAction } from "@/app/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
        Sair
      </button>
    </form>
  );
}
