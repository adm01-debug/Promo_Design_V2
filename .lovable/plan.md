

## Implementação completa das rotas `/dam` e `/clients/:clientId/brand`

As páginas já existem no projeto (`DamLibraryPage.tsx` e `BrandGuidelinesPage.tsx`) e estão registradas em `App.tsx`. O que falta é **completar lacunas de UX** identificadas na auditoria de gaps: toggle grid/lista, filtro por tags, e melhorias de busca.

### O que vai ser entregue

**1. `/dam` — DamLibraryPage com filtros completos**
- Toggle **grid ↔ lista** (reaproveitar `LayoutPopover` existente, igual aos outros módulos)
- View "lista": tabela com thumbnail, nome, tipo, cliente, tags, cores, data
- **Filtro por tags** (multi-select) — chips clicáveis abaixo da busca; lê tags únicas dos assets carregados
- **Toggle "Mostrar arquivados"** (gap #3 da auditoria) — switch ao lado dos filtros
- Busca por nome já existe; estender para também buscar em `description` e `tags`
- Contador de resultados ("12 assets encontrados")
- Skeleton loader enquanto carrega

**2. `/clients/:clientId/brand` — BrandGuidelinesPage**
- Já está implementada; vou apenas:
  - Adicionar **breadcrumb** "Clientes › [Nome do cliente] › Brand"
  - Mostrar **nome do cliente** no header (buscar via `useClients`)
  - Adicionar **preview "Brand Card"** ao final: card visual aplicando paleta primária + fonte do título + logo
  - Validar empty state quando não há guidelines salvas

**3. Componente novo: `AssetListView`**
- View tabular reutilizável para a lista de assets
- Colunas: thumbnail (40px), nome, tipo (badge), cliente, tags (chips), cores (swatch), data
- Click na linha abre o `AssetDetailDrawer`

**4. Componente novo: `TagFilter`**
- Multi-select de tags com chips removíveis
- Extrai tags únicas dos assets carregados
- Suporta busca dentro do dropdown

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/features/dam/pages/DamLibraryPage.tsx` | Editar — adicionar toggle view, tag filter, archived toggle |
| `src/features/dam/pages/BrandGuidelinesPage.tsx` | Editar — breadcrumb, nome cliente, brand card preview |
| `src/features/dam/components/AssetListView.tsx` | Criar — view tabular |
| `src/features/dam/components/TagFilter.tsx` | Criar — multi-select de tags |
| `src/features/dam/components/BrandPreviewCard.tsx` | Criar — preview visual aplicando guidelines |
| `src/features/dam/hooks/use-assets.ts` | Editar — passar `includeArchived` e busca em tags |

### Detalhes técnicos

- Persistir preferência grid/lista em `localStorage["dam-view-mode"]`
- `useAssets` já aceita `includeArchived`; passar do toggle UI
- Tag filter envia `filters.tags` ao hook (já suportado)
- Brand Card usa CSS variables inline para aplicar a cor primária dinamicamente
- Mantém RBAC: botões "Novo asset" e edições gated via `can(["owner","admin","designer"])`

### Critérios de aceite

- Toggle grid/lista alterna sem perder filtros
- Click em uma tag adiciona ao filtro; click novamente remove
- Switch "Arquivados" mostra/esconde assets com `is_archived=true`
- Em `/clients/:id/brand` o nome do cliente aparece no header
- Brand Card renderiza paleta + fonte aplicadas, mesmo sem logo

