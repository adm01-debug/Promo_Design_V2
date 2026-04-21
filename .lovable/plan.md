

## DAM — Digital Asset Management por Cliente

Biblioteca compartilhada de assets (logos, artes, mockups) por organização, com vínculo opcional a cliente, tags, busca, e brand guidelines (paleta, fontes, do/don't) por cliente.

### Banco de dados (migração)

**Enum** `asset_type`: `logo` | `art` | `photo` | `mockup` | `document` | `other`

**Tabela `assets`** (multi-tenant, vínculo opcional a cliente)
- `id`, `organization_id` (FK), `client_id` (FK nullable — assets gerais da org sem cliente)
- `name`, `description`, `asset_type`, `file_path` (caminho no bucket), `file_size`, `mime_type`
- `width`, `height` (px, para imagens), `dominant_colors` (text[] hex), `thumbnail_path`
- `tags` (text[]), `metadata` (jsonb — DPI, formato vetor, etc.)
- `version` (int, default 1), `parent_asset_id` (FK self — versionamento)
- `is_archived`, `created_by`, `created_at`, `updated_at`
- Índices: `(organization_id)`, `(client_id)`, `(asset_type)`, GIN em `tags`
- RLS: membros leem; designers+ inserem/editam; admins+ deletam (mesmo padrão de `clients`)
- Trigger de auditoria via `write_audit_log()` já existente

**Tabela `brand_guidelines`** (1:1 por cliente)
- `id`, `organization_id`, `client_id` (UNIQUE)
- `primary_colors` (jsonb — `[{name, hex}]`), `secondary_colors` (jsonb)
- `fonts` (jsonb — `[{name, usage, source}]`)
- `do_rules` (text[]), `dont_rules` (text[])
- `logo_asset_id` (FK assets — logo principal)
- `notes`, timestamps
- RLS: igual a `clients`; trigger de auditoria

**Bucket de Storage `assets`** (privado, novo — mantém `art-uploads` intacto)
- Caminho: `{organization_id}/{client_id|_org}/{asset_id}/{filename}`
- Policies: leitura/escrita para membros da org dona do prefixo (validado via `is_member_of` do prefixo de path)

### Backend (lógica de upload)

Hook `useAssetUpload` (novo, em `src/features/dam/hooks/`):
- Recebe `File`, `organizationId`, `clientId?`, `assetType`, `tags`
- Gera thumbnail client-side (canvas, 256px max) para imagens
- Extrai `dominant_colors` (top 3) reaproveitando `countUniqueColors` de `canvas-utils.ts`
- Faz upload do arquivo + thumbnail no bucket `assets`
- Insere row em `assets` com signed URLs gerados sob demanda

### Frontend (nova feature `src/features/dam/`)

**Hooks**
- `use-assets.ts` — listar (com filtros: cliente, tipo, tags, busca textual), criar, atualizar, arquivar, criar nova versão
- `use-brand-guidelines.ts` — get/upsert por cliente

**Páginas**
- `/dam` (DamLibraryPage) — biblioteca completa da organização
  - Filtros: cliente (select), tipo (chips), tags (multi-select), busca por nome
  - Toggle grid/list; cards mostram thumbnail, nome, tipo, tags, swatch de cores dominantes
  - Botão "Novo asset" → `AssetUploadDialog` (drag-and-drop, multi-arquivo)
  - Click no asset → `AssetDetailDrawer` (preview grande, metadata, versões, ações: baixar, copiar URL, nova versão, arquivar)
- `/clients/:clientId/brand` (BrandGuidelinesPage) — guidelines do cliente
  - Editor de paleta (primárias/secundárias com color picker)
  - Lista de fontes (nome, uso, link/upload)
  - Listas Do / Don't (textareas estilo bullet)
  - Seletor de logo principal (modal de assets do cliente)
  - Preview "Brand Card" com tudo aplicado
- Aba "Assets" e "Brand" adicionadas dentro do detalhe do cliente em `/clients` (tabs)

**Componentes reutilizáveis**
- `AssetCard`, `AssetGrid`, `AssetUploadDialog`, `AssetPicker` (modal — usado no Mockup Studio para escolher logo da biblioteca)
- `ColorSwatchEditor`, `FontList`, `RuleList` (do/don't)

### Integrações com features existentes

- **Mockup Editor**: botão "Escolher da biblioteca" no upload de logo → abre `AssetPicker` filtrado pelo cliente da OS
- **Service Order**: ao selecionar cliente, sugere logo principal do `brand_guidelines.logo_asset_id`
- **Sidebar**: novo item "DAM" no grupo Mockup Studio (ícone `FolderArchive`)
- **App.tsx**: rotas `/dam` e `/clients/:clientId/brand`

### Critérios de aceite

- Upload de logo + tags + cliente → aparece na biblioteca filtrado
- Busca por tag e por nome funciona com performance (índice GIN)
- Versionamento: "nova versão" cria asset com `parent_asset_id` e incrementa `version`
- Brand guidelines salvas por cliente; preview renderiza cores e fontes
- Asset Picker no Mockup carrega logo selecionado direto no canvas
- Audit log registra cada upload/edição/arquivamento
- RLS: membro de outra organização não vê assets nem guidelines

### Fora de escopo (próximas iterações)

- Auto-tagging por IA (previsto na Onda 3)
- Busca semântica por embeddings
- Editor de imagem inline
- Aprovação de assets com workflow (vai com Proofing na Onda 2)

