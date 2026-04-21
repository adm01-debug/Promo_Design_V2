

## Audit Trail — filtros avançados e UX completa

A tela `/audit` já existe (`AuditLogPage.tsx`) mas é minimalista: lista as últimas 200 ações sem filtros nem paginação. Vou transformá-la em uma ferramenta de consulta completa, aproveitando 100% da infra existente (`audit_log` + `current_user_orgs` + RLS por organização).

### Filtros (header da página)

- **Período**: presets (hoje · 7 dias · 30 dias · 90 dias) + custom range com 2 calendários (date pickers shadcn)
- **Tipo de ação**: multi-select (INSERT / UPDATE / DELETE / todos)
- **Tabela**: dropdown populado dinamicamente com `DISTINCT table_name` da org corrente (service_orders, assets, clients, brand_guidelines, etc.)
- **Usuário**: dropdown com membros da organização (usa `useOrgMembers(currentOrgId)` — já existe)
- **Busca textual**: por `record_id` (UUID parcial, mín. 4 chars)
- **Botão "Limpar filtros"** + chips de filtros ativos no topo

Todos os filtros sincronizam com querystring (`?from=...&to=...&action=UPDATE,DELETE&table=service_orders&user=<uuid>&q=`).

### Lista (corpo)

Substitui a lista atual por uma **tabela** (`@/components/ui/table`) com colunas:

| Quando | Usuário | Ação | Tabela | Registro | Detalhes |
|---|---|---|---|---|---|

- **Quando**: timestamp absoluto + relativo no tooltip ("há 2h")
- **Usuário**: iniciais em avatar + email (lookup via `organization_members` → join com user_id; fallback para UUID truncado se não for membro atual)
- **Ação**: badge colorido (INSERT verde, UPDATE âmbar, DELETE vermelho)
- **Tabela**: nome em fonte mono
- **Registro**: UUID truncado clicável → copia completo
- **Detalhes**: botão "Ver" abre **dialog** com diff JSON de `old_values` vs `new_values` (lado a lado, com keys alteradas destacadas)

### Paginação + export

- Paginação server-side: 50 por página, `range(offset, offset+49)`, contagem total via `{ count: "exact" }`
- Botão **"Exportar CSV"** no header gera CSV com filtros atuais (até 5000 linhas) — `Blob` + download
- Indicador "X eventos · página Y de Z"

### Diff viewer (dialog)

- 2 colunas: "Antes" (vermelho suave) / "Depois" (verde suave)
- Para INSERT: só mostra "Depois"; para DELETE: só "Antes"
- Para UPDATE: highlight nas chaves cujo valor mudou (compara `old_values[k] !== new_values[k]`)
- JSON renderizado em `<pre>` com `JSON.stringify(..., null, 2)`
- Header do dialog mostra: ação · tabela · timestamp · user_id

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/features/audit/pages/AuditLogPage.tsx` | Reescrever — header com filtros, tabela paginada, integração com hook |
| `src/features/audit/hooks/use-audit-log.ts` | Criar — query React Query com filtros, paginação, count exact, distinct tables |
| `src/features/audit/components/AuditFilters.tsx` | Criar — barra de filtros (período/ação/tabela/usuário/busca) |
| `src/features/audit/components/AuditDiffDialog.tsx` | Criar — dialog com diff old vs new |
| `src/features/audit/lib/audit-csv.ts` | Criar — helper para gerar CSV |

### Detalhes técnicos

- **Query Supabase**: `.from("audit_log").select("*", { count: "exact" }).eq("organization_id", currentOrgId).gte("created_at", from).lte("created_at", to).in("action", [...]).eq("table_name", ...).eq("user_id", ...).ilike("record_id::text", "%q%").order("created_at", { ascending: false }).range(offset, offset+49)`
- **Distinct tables** via segunda query leve com `.select("table_name")` e dedup no client (audit_log não tem RPC de distinct, mas o volume já filtrado por org é manejável; cache com `staleTime: 5min`)
- **Members lookup**: `useOrgMembers(currentOrgId)` para mapear `user_id → email/iniciais`
- **CSV**: header `Quando,Usuario,Acao,Tabela,RecordId` + escape de aspas
- **RLS**: já garante que só vê audit da org atual — sem mudanças no banco
- **Performance**: índice por `organization_id + created_at` provavelmente já existe; se queries ficarem lentas, plano fala em adicionar via migration (não necessário no MVP)
- **Vazio**: estados claros — "Sem eventos" / "Nenhum resultado para os filtros aplicados"

### Critérios de aceite

- Filtros de período (presets + custom) reduzem a lista server-side
- Multi-select de ação (INSERT/UPDATE/DELETE) funciona combinado
- Filtro de tabela só lista tabelas com eventos na org atual
- Filtro de usuário lista membros da org corrente
- Paginação 50/página com total visível
- Click em "Ver" abre dialog com diff antes/depois (chaves alteradas destacadas em UPDATE)
- "Exportar CSV" baixa arquivo respeitando filtros
- URL reflete filtros (compartilhável)
- Sem regressão na rota `/audit` existente

