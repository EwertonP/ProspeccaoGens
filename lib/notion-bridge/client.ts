import { Client } from "@notionhq/client";

// Token de integração interna do Notion (NOTION_API_KEY) -- diferente do
// acesso da sessão de desenvolvimento, é uma credencial própria do app,
// criada e compartilhada manualmente com a base "Leads Qualificados" (ver
// README -- Setup pendente). Padrão de falha explícita: promover um lead é
// uma ação deliberada, deve falhar visivelmente sem token configurado.
export class NotionCredentialsError extends Error {
  constructor(message = "NOTION_API_KEY não configurada") {
    super(message);
    this.name = "NotionCredentialsError";
  }
}

let client: Client | null = null;

export function getNotionClient(): Client {
  const token = process.env.NOTION_API_KEY;
  if (!token) throw new NotionCredentialsError();
  if (!client) client = new Client({ auth: token });
  return client;
}

export function getLeadsDatabaseId(): string {
  const id = process.env.NOTION_LEADS_DATABASE_ID;
  if (!id) throw new NotionCredentialsError("NOTION_LEADS_DATABASE_ID não configurada");
  return id;
}
