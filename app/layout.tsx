import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motor de Prospecção B2B",
  description: "Coleta, qualificação e prospecção de leads B2B da agência",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
