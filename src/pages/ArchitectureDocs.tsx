import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { BookOpen, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ARCHITECTURE_MD = `
# Guia de Arquitetura - Freight Quest

Este documento descreve a arquitetura técnica, o fluxo de dados e os contratos de integração do projeto Freight Quest.

## 1. Diagrama de Sequência: Fluxo de Dados (Frontend para Edge Function)

O diagrama abaixo ilustra como uma ação do usuário (ex: sugestão de IA ou processamento pesado) trafega do componente até a Edge Function e retorna para a interface.

\`\`\`mermaid
sequenceDiagram
    participant UI as Componente (React)
    participant Hook as Custom Hook (React Query)
    participant Client as Supabase Client
    participant EF as Edge Function (Deno)
    participant DB as Banco de Dados (PostgreSQL)

    UI->>Hook: Chama função de ação (ex: handleSuggest)
    Hook->>Hook: Define estado isLoading = true
    Hook->>Client: supabase.functions.invoke('mockup-ai', { body })
    Client->>EF: Requisição HTTP POST (Auth JWT)
    
    Note over EF: Validação de Payload
    Note over EF: Processamento (IA/Lógica)
    
    EF->>DB: Query de suporte (se necessário)
    DB-->>EF: Retorno de dados
    
    EF-->>Client: Response (JSON + Status 200/400/500)
    Client-->>Hook: Retorno da Promise
    
    alt Sucesso
        Hook->>UI: Atualiza cache e exibe toast de sucesso
    else Erro
        Hook->>UI: Dispara erro e exibe toast de falha
    end
    
    Hook->>UI: Define estado isLoading = false
\`\`\`

---

## 2. Mapa do Projeto e Responsabilidades

A estrutura do projeto segue um padrão de **Feature-based Architecture**, facilitando a escalabilidade.

### Estrutura de Pastas
- \`src/features/\`: Módulos independentes por domínio de negócio.
    - \`[feature-name]/components/\`: Componentes específicos da feature.
    - \`[feature-name]/hooks/\`: Lógica de estado e chamadas à API (React Query).
    - \`[feature-name]/pages/\`: Telas principais da feature.
    - \`[feature-name]/lib/\`: Utilitários puros da feature.
- \`src/components/ui/\`: Biblioteca de componentes base (Shadcn/UI).
- \`src/hooks/\`: Hooks globais (Auth, Theme, Mobile detection).
- \`src/integrations/\`: Configurações de serviços externos (Supabase).
- \`supabase/functions/\`: Código das Edge Functions (Backend Serverless).

### Camadas de Responsabilidade
1.  **View (Componentes):** Preocupam-se apenas com a renderização e interação do usuário.
2.  **Controller (Hooks):** Gerenciam o estado local, cache do servidor (React Query) e efeitos colaterais.
3.  **Service (Supabase Client):** Interface de comunicação com o backend e persistência.
4.  **Backend (Edge Functions):** Lógica complexa que não deve rodar no cliente (segurança, IA, integrações pesadas).

---

## 3. Exemplos de Chamadas Reais

### Chamada de Busca (Query)
\`\`\`typescript
const { data, isLoading } = useQuery({
  queryKey: ["catalog-products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("catalog_products").select("*");
    if (error) throw error;
    return data;
  }
});
\`\`\`

### Chamada de Ação (Mutation + Edge Function)
\`\`\`typescript
const { mutateAsync } = useMutation({
  mutationFn: async (payload) => {
    const { data, error } = await supabase.functions.invoke("mockup-ai", {
      body: { action: "suggest-placement", ...payload }
    });
    if (error) throw error;
    return data;
  }
});
\`\`\`

---

## 4. Contrato da Edge Function: \`external-db-bridge\`

Esta função atua como um middleware de segurança e padronização para comunicação com sistemas externos (ERP/DB legados).

### Formato de Requisição (Request)
- **Método:** \`POST\`
- **Headers:** \`Authorization: Bearer <JWT>\`, \`Content-Type: application/json\`
- **Payload:**
\`\`\`json
{
  "action": "sync_order" | "fetch_inventory" | "update_status",
  "table": "orders" | "products" | "shipments",
  "params": {
    "id": "UUID",
    "filter": {},
    "data": {}
  }
}
\`\`\`

### Formato de Resposta (Response)
- **Sucesso (200 OK):**
\`\`\`json
{
  "success": true,
  "data": [],
  "metadata": { "execution_time_ms": 120 }
}
\`\`\`
- **Erro (400/500):**
\`\`\`json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS" | "EXTERNAL_SERVICE_TIMEOUT" | "INVALID_PAYLOAD",
    "message": "Descrição amigável do erro"
  }
}
\`\`\`

### Tabelas Suportadas
- \`catalog_products\`: Sincronização de catálogo com o dashboard.
- \`service_orders\`: Gestão de ordens de serviço e status de produção.
- \`audit_logs\`: Registro centralizado de eventos críticos para compliance.

---

## 5. Padrões de Tratamento de Erro
- **Frontend:** Uso de \`ErrorBoundary\` para falhas críticas de renderização e \`Sonner/Toast\` para falhas de mutação.
- **Backend:** Validação rigorosa de payload com Zod (ou similar) e logs estruturados em cada etapa do processamento na Edge Function.
`;

const ArchitectureDocs = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="h-16 border-b flex items-center px-6 gap-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-lg tracking-tight">Arquitetura do Sistema</h1>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto py-12 px-6">
          <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-primary prose-code:text-primary prose-pre:bg-muted prose-pre:border">
            <ReactMarkdown>{ARCHITECTURE_MD}</ReactMarkdown>
          </article>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ArchitectureDocs;
