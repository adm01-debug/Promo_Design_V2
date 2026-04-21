

## Tela de detalhes do evento de Audit Trail por record_id

Hoje o `AuditDiffDialog` já mostra os valores `old/new` lado a lado, mas só dentro de um modal a partir da listagem — não há rota dedicada nem forma de compartilhar/abrir um evento específico por URL. Vamos criar uma página de detalhes acessível por `record_id` (com fallback para `id` do evento) que mostra tudo: metadados completos, diff visual, e contexto histórico do mesmo registro.

### Mudanças

**1. Nova rota: `/audit/event/:eventId`**

Em `src/App.tsx`, adicionar:
```tsx
<Route path="audit/event/:eventId" element={<AuditEventDetailPage />} />
```
Lazy-load a página, igual ao `AuditLogPage`.

**2. Nova página: `src/features/audit/pages/AuditEventDetailPage.tsx`**

Estrutura:
- **Header**: botão "Voltar para auditoria" (link para `/audit` preservando filtros via `document.referrer` ou fallback), título com badge da ação (INSERT/UPDATE/DELETE colorido), nome da tabela em monospace, timestamp formatado + relativo.
- **Card de metadados** (grid 2 colunas):
  - ID do evento (com botão copiar)
  - Record ID (com botão copiar e link "Ver outros eventos deste registro" → filtra `/audit?q=<record_id>`)
  - Tabela
  - Usuário (label do `useOrgMembers` + uuid completo)
  - Organização ID
  - IP address (`ip_address`)
  - User agent (`user_agent`, truncado com tooltip)
  - Data/hora ISO completa
- **Card de diff**: reusa exatamente a lógica visual do `AuditDiffDialog` (Antes/Depois lado a lado, highlight de chaves alteradas em âmbar), mas inline na página (não em modal), expandido por padrão. Adicionar toggle "Mostrar apenas campos alterados" (filtra chaves não-modificadas em UPDATE).
- **Card de JSON cru**: dois `<pre>` colapsáveis (`Collapsible`) com `old_values` e `new_values` em JSON formatado, com botão "Copiar JSON".
- **Card "Histórico do registro"**: lista os outros eventos do mesmo `record_id` (mesma tabela + mesmo record_id, ordenado por `created_at desc`, máximo 20), cada item clicável navega para `/audit/event/<id>`. Destaca o evento atual.

**3. Refatorar `AuditDiffDialog.tsx` em componente compartilhado**

Extrair a lógica de diff (`changedKeys`, `renderJson`, layout Antes/Depois) para `src/features/audit/components/AuditDiffView.tsx`. O `AuditDiffDialog` passa a ser um wrapper fino que usa `AuditDiffView` dentro do `Dialog`. A `AuditEventDetailPage` consome `AuditDiffView` diretamente.

Props de `AuditDiffView`:
```ts
interface AuditDiffViewProps {
  oldValues: unknown;
  newValues: unknown;
  action: AuditAction;
  showOnlyChanged?: boolean;
}
```

**4. Hook novo em `use-audit-log.ts`**

```ts
export function useAuditEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["audit-event", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<AuditEntry & { ip_address: string | null; user_agent: string | null; organization_id: string | null }> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, organization_id, user_id, table_name, record_id, action, created_at, old_values, new_values, ip_address, user_agent")
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Evento não encontrado");
      return data as any;
    },
  });
}

export function useAuditRecordHistory(tableName: string | undefined, recordId: string | null | undefined, excludeEventId?: string) {
  return useQuery({
    queryKey: ["audit-record-history", tableName, recordId],
    enabled: !!tableName && !!recordId,
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, user_id, table_name, record_id, action, created_at, old_values, new_values")
        .eq("table_name", tableName!)
        .eq("record_id", recordId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
  });
}
```

**5. Tornar a linha clicável + botão "Abrir página" no `AuditLogPage.tsx`**

No `Eye` button da tabela, manter o comportamento atual (abrir modal rápido) mas adicionar segundo botão `ExternalLink` que navega para `/audit/event/<entry.id>` em nova aba (ou mesma, decidir por padrão = mesma aba). Isso mantém o fluxo rápido (modal) e habilita o fluxo profundo (página dedicada compartilhável).

No `AuditDiffDialog`, adicionar link "Abrir página completa" no header do dialog que navega para a página de detalhes e fecha o modal.

**6. Estados de erro/loading**

- Loading: skeleton dos 3 cards.
- Erro / não encontrado: card centrado com ícone, mensagem "Evento não encontrado ou você não tem permissão" e botão "Voltar para auditoria".
- RLS: a policy `Org members can view audit log` já cobre — se o usuário não for membro da org do evento, o `maybeSingle()` retorna `null` e cai no estado de erro.

### Arquivos tocados

- `src/App.tsx` (nova rota)
- `src/features/audit/pages/AuditEventDetailPage.tsx` (novo)
- `src/features/audit/components/AuditDiffView.tsx` (novo, extraído do dialog)
- `src/features/audit/components/AuditDiffDialog.tsx` (refatorado para usar `AuditDiffView`, +link "página completa")
- `src/features/audit/hooks/use-audit-log.ts` (+`useAuditEvent`, +`useAuditRecordHistory`)
- `src/features/audit/pages/AuditLogPage.tsx` (botão `ExternalLink` por linha)

### Critérios de aceite

- URL `/audit/event/:eventId` carrega evento isolado com todos os metadados (incluindo `ip_address`, `user_agent`, `organization_id`).
- Diff visual idêntico ao do modal, com toggle "apenas campos alterados".
- JSON cru copiável de ambos `old_values` e `new_values`.
- Card "Histórico do registro" lista até 20 eventos do mesmo `record_id`, evento atual destacado, demais clicáveis.
- Botão "Voltar" retorna para `/audit` (preserva filtros se vier de lá via histórico do navegador).
- Modal rápido continua funcionando + ganha link "Abrir página completa".
- Listagem ganha botão `ExternalLink` por linha que abre a página dedicada.
- Acessibilidade: foco visível, `aria-label` nos botões de copiar, badges com `role="status"`.
- Sem regressão: filtros, paginação, exportação CSV, busca por valor JSON continuam intactos.

