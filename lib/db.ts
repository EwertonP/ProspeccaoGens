import { neon } from "@neondatabase/serverless";

// Acesso direto ao Postgres via DATABASE_URL (role dona do banco --
// ignora RLS por padrão, mesmo papel que a service_role key tinha no
// Supabase). Substitui lib/supabase/admin.ts. Uso restrito a código
// server-only (API routes, lib/ingest.ts) -- nunca importar num Client
// Component.
export class DatabaseCredentialsError extends Error {
  constructor(message = "DATABASE_URL não configurada") {
    super(message);
    this.name = "DatabaseCredentialsError";
  }
}

// Linha reta pra "array de linhas" (não o modo array/fullResults do
// driver) -- fixa o tipo de retorno pra evitar que todo call site precise
// de type assertion.
type Row = Record<string, any>;
type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>;

let sqlClient: SqlFn | null = null;

export function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<Row[]> {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new DatabaseCredentialsError();
    sqlClient = neon(url) as unknown as SqlFn;
  }
  return sqlClient(strings, ...values);
}
