import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-5 text-sm font-medium text-neutral-700">
            <span className="font-semibold text-neutral-900">Prospecção B2B</span>
            <Link href="/runs" className="hover:text-neutral-900">Coleta</Link>
            <Link href="/leads" className="hover:text-neutral-900">Leads</Link>
            <Link href="/settings" className="hover:text-neutral-900">Configurações</Link>
          </nav>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
