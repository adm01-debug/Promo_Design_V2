

## Saved Searches no DAM — salvar e reaplicar filtros em 1 clique

Permitir que o usuário nomeie a combinação atual de filtros da biblioteca DAM (busca, tipos, cliente, tags + modo, arquivados, ordenação) e reaplique em um clique. Persistência por usuário no Supabase, com RLS.

### Backend (migração)

Nova tabela `dam_saved_searches`:

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `organization_id` | uuid NOT NULL | escopo |
| `user_id` | uuid NOT NULL | dono |
| `name` | text NOT NULL | rótulo curto (≤80) |
| `filters` | jsonb NOT NULL | snapshot do `DamFiltersState` |
| `is_pinned` | boolean | aparece no topo (max 5 fixados) |
| `created_at` / `updated_at` | timestamptz | padrão `now()` + trigger |

- Índice: `(organization_id, user_id, created_at DESC)`.
- UNIQUE `(organization_id, user_id, lower(name))` para evitar duplicatas.
- Trigger `update_updated_at_column` (já existe) para `updated_at`.
- RLS: usuário só vê/edita/deleta os próprios (`auth.uid() = user_id` + `is_member_of(auth.uid(), organization_id)`).

### Frontend

**1. Hook novo `src/features/dam/hooks/use-saved-searches.ts`**
- React Query: `list(orgId, userId)`, `create({name, filters, is_pinned})`, `update(id, patch)`, `remove(id)`, `togglePin(id)`.
- Query key `["dam-saved-searches", orgId, userId]`; invalidar nas mutations.
- Validação Zod do payload `filters` (mesmos campos de `DamFiltersState`).

**2. Componente novo `src/features/dam/components/SavedSearchesMenu.tsx`**
- Botão "Filtros salvos" no header da `DamLibraryPage` (ao lado dos botões existentes).
- `DropdownMenu` com:
  - Lista de saved searches (fixados primeiro com ícone Pin, depois recentes).
  - Cada item: clique aplica → chama `filters.applyAll(snapshot)`; submenu com "Renomear", "Fixar/Desafixar", "Excluir".
  - Item "Salvar filtros atuais…" abre `Dialog` para nome (Input + validação ≥2 chars, único).
  - Indicador visual quando os filtros atuais batem com algum salvo (badge "Ativo").

**3. Estender `useDamFilters`**
- Adicionar método `applyAll(state: DamFiltersState)` que faz `setState(state)` e dispara o effect de URL/LS já existente.
- Exportar `state` serializável (já é) para snapshot.

**4. Integração em `DamLibraryPage.tsx`**
- Importar `SavedSearchesMenu`, renderizar no header entre o seletor de cliente e o botão de upload.
- Passar `filters` (do hook `useDamFilters` — verificar se já é usado lá; senão refatorar para usar o hook centralizado em vez do estado local atual).

### Detalhes técnicos

- **Snapshot format**: serializar `DamFiltersState` direto como JSON (já é POJO). Versionar com campo `_v: 1` para futuras migrações.
- **Resolver state local vs hook**: `DamLibraryPage` hoje gerencia filtros com `useState` + LS direto (não usa `useDamFilters`). Refatorar para consumir `useDamFilters` (já usado por `DamPreviewPage`), eliminando duplicação. Sem mudança visual.
- **Limite**: máximo 50 saved searches/usuário/org (validar no client; sem hard cap no DB).
- **i18n**: textos em PT-BR ("Filtros salvos", "Salvar filtros atuais", "Aplicar", "Fixar", "Renomear", "Excluir").
- **Acessibilidade**: dropdown com `aria-label`, dialog com foco no input, confirmação inline (não confirm modal) para excluir.

### Critérios de aceite

- Tabela `dam_saved_searches` criada com RLS funcional (testar com 2 usuários da mesma org não verem entradas um do outro).
- Botão "Filtros salvos" aparece no header de `/dam`.
- "Salvar filtros atuais" persiste o snapshot e aparece imediatamente na lista.
- Clicar em uma saved search reaplica todos os filtros (search, types, client, tags, tagsMode, archived, sort) e atualiza a URL.
- Fixar/Renomear/Excluir funcionam com feedback toast.
- Badge "Ativo" aparece no item cuja config bate com o estado atual.
- `DamLibraryPage` passa a usar `useDamFilters` (refator sem regressão de comportamento atual).
- `docs/FEATURES.md` atualizado: linha "Busca avançada (saved searches)" passa de 🔴 para ✅, observação atualizada, e a entrada correspondente na seção 10 removida.

