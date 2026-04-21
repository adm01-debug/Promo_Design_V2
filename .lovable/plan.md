

## Auditoria de Funcionalidades sem UI Completa — `GAPS_UI.md`

Vou gerar um documento markdown (`/mnt/documents/PROMO_DESIGN_GAPS_UI.md`) catalogando funcionalidades que existem no backend (tabelas, hooks, funções DB, edge functions) mas **não possuem interface visual completa** ou estão **subutilizadas** na UI atual.

### Metodologia

Cruzamento entre:
1. Schema do banco (15 tabelas, 10 funções DB, 2 buckets)
2. Hooks em `src/features/*/hooks/` e `src/hooks/`
3. Edge functions em `supabase/functions/`
4. Rotas em `App.tsx` e navegação em `AppSidebar.tsx`
5. Componentes existentes vs. capabilities expostas

### Estrutura do documento

1. **Resumo Executivo** — quantos gaps encontrados, severidade
2. **Gaps Críticos** (capability existe no DB/hook mas zero UI)
3. **Gaps Parciais** (UI existe mas não expõe todas as capabilities)
4. **Hooks Órfãos** (criados mas não consumidos por nenhum componente)
5. **Funções DB sem trigger UI** (RPCs que poderiam ter ações visuais)
6. **Edge Functions subutilizadas**
7. **Tabelas com CRUD incompleto** (ex: só leitura, falta UI de criação/edição)
8. **Recomendações Priorizadas** (impacto × esforço)

### Itens já identificados na exploração prévia

- **`client_contacts`** — tabela existe, hook gerencia, mas UI de múltiplos contatos por cliente não está visível na ClientsPage
- **`assets` versionamento** — `parent_asset_id` + `version` no schema, hook `update` suporta, mas não há botão "Nova versão" no AssetDetailDrawer
- **`assets.is_archived`** — mutation `archive` existe, mas UI não tem toggle "Mostrar arquivados" nem ação visível
- **Brand Guidelines `logo_asset_id`** — campo existe, mas integração de auto-sugestão na OS pode estar incompleta
- **Asset Picker no Mockup Editor** — componente criado, validar se foi conectado ao fluxo de upload de logo
- **`audit_log` filtros** — página `/audit` existe, mas validar profundidade de filtros (por tabela, ação, usuário, range de datas)
- **`organization_members` convites por email** — Edge Function planejada na Onda 1, validar se UI de convite envia email real
- **`has_any_role` / `can()`** — helper existe no `useOrganization`, validar se botões críticos (delete, role change) estão gated por role
- **Notificações** — sistema existe, validar se há central de preferências de notificação
- **Magic Up favoritos** — campo no schema, validar UI de filtro/marcação
- **Catalog analytics** — componente existe, validar se está plugado em alguma rota

### Entregável

Arquivo `/mnt/documents/PROMO_DESIGN_GAPS_UI.md` com:
- Tabela por categoria de gap
- Para cada gap: capability do backend, evidência (arquivo/linha), o que falta na UI, esforço estimado, prioridade sugerida
- Seção final com top 10 quick wins (alta visibilidade, baixo esforço)
- Tag `<lov-artifact>` para download

