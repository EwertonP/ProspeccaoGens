// Server Component -- lê só se as variáveis de ambiente estão presentes
// (nunca os valores em si) pra mostrar o status de cada integração. v1:
// somente leitura; templates editáveis em banco ficam pra v1.5.
function statusRow(label: string, configured: boolean, hint?: string) {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
      <span className={`rounded px-2 py-1 text-xs font-medium ${configured ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
        {configured ? "Configurado" : "Pendente"}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configurações</h1>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Integrações</h2>
        {statusRow("Apify (coleta Google Maps)", !!process.env.APIFY_TOKEN, "APIFY_TOKEN")}
        {statusRow("Resend (e-mail automatizado)", !!process.env.RESEND_API_KEY, "RESEND_API_KEY -- exige domínio verificado")}
        {statusRow("Notion (Kanban de Leads Qualificados)", !!process.env.NOTION_API_KEY && !!process.env.NOTION_LEADS_DATABASE_ID, "NOTION_API_KEY + NOTION_LEADS_DATABASE_ID")}
        {statusRow("Link de agendamento", !!process.env.NEXT_PUBLIC_SCHEDULING_LINK, "NEXT_PUBLIC_SCHEDULING_LINK")}
      </section>

      <p className="text-sm text-neutral-500">
        Veja o README do projeto pra o passo a passo de cada integração (criar token do Apify, verificar domínio no
        Resend, criar a integração interna do Notion e compartilhar a base "Leads Qualificados" com ela).
      </p>
    </div>
  );
}
