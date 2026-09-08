import { Badge, Card, CardTitle } from "@/components/ui";

// Server Component -- lê só se as variáveis de ambiente estão presentes
// (nunca os valores em si) pra mostrar o status de cada integração. v1:
// somente leitura; templates editáveis em banco ficam pra v1.5.
function statusRow(label: string, configured: boolean, hint?: string) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <Badge tone={configured ? "emerald" : "amber"}>{configured ? "Configurado" : "Pendente"}</Badge>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Configurações</h1>

      <Card>
        <CardTitle>Integrações</CardTitle>
        {statusRow("Apify (coleta Google Maps)", !!process.env.APIFY_TOKEN, "APIFY_TOKEN")}
        {statusRow("Resend (e-mail automatizado)", !!process.env.RESEND_API_KEY, "RESEND_API_KEY -- exige domínio verificado")}
        {statusRow("Notion (Kanban de Leads Qualificados)", !!process.env.NOTION_API_KEY && !!process.env.NOTION_LEADS_DATABASE_ID, "NOTION_API_KEY + NOTION_LEADS_DATABASE_ID")}
        {statusRow("Link de agendamento", !!process.env.NEXT_PUBLIC_SCHEDULING_LINK, "NEXT_PUBLIC_SCHEDULING_LINK")}
      </Card>

      <p className="text-sm text-muted">
        Veja o README do projeto pra o passo a passo de cada integração (criar token do Apify, verificar domínio no
        Resend, criar a integração interna do Notion e compartilhar a base "Leads Qualificados" com ela).
      </p>
    </div>
  );
}
