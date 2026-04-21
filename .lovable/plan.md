

## Upload drag-and-drop + Versionamento de Assets

Estender o fluxo de upload do DAM com drag-and-drop completo, tags multi-chip, e capacidade de criar **nova versão** de um asset existente preservando `parent_asset_id` e incrementando `version`.

### O que vai mudar

**1. `AssetUploadDialog` — refatorar para drag-and-drop premium**
- Dropzone real com eventos `onDragEnter/Leave/Over/Drop` (estado visual de hover ativo)
- Lista de arquivos selecionados com thumbnail-preview, nome, tamanho, e botão remover por arquivo
- Validação de tamanho (max 20MB) e tipos (imagem/PDF/SVG/AI/PSD)
- Campo de **tags como chips** (input + Enter/vírgula adiciona, X remove) em vez do textarea CSV atual
- Sugestão de tags já existentes na organização (autocomplete via Popover/Command)
- Progresso individual por arquivo durante upload em lote
- Modo dual: **"Novos assets"** (default) ou **"Nova versão de X"** (quando vem de um asset existente)

**2. Hook `useAssetUpload` — suportar versionamento**
- Novo parâmetro opcional `parentAsset?: Asset` em `UploadOptions`
- Quando presente:
  - `parent_asset_id = parentAsset.id` (ou raiz da cadeia: `parent_asset_id ?? id`)
  - `version = parentAsset.version + 1`
  - Herda `asset_type`, `client_id`, `tags` do pai (editáveis no diálogo)
  - Nome default: `"{nome original} v{N}"`
- Mantém geração de thumbnail e extração de cores dominantes existentes

**3. `AssetDetailDrawer` — botão "Nova versão"**
- Visível para roles `owner/admin/designer`
- Abre `AssetUploadDialog` em modo versão, pré-populando metadados do asset atual
- Após upload, drawer atualiza para mostrar a nova versão

**4. Nova aba "Histórico de versões" no `AssetDetailDrawer`**
- Lista todas as versões do asset (query: `parent_asset_id = root OR id = root`)
- Mostra versão, data, autor, thumbnail; click em versão antiga abre seu próprio drawer
- Badge "atual" na versão mais recente

**5. Hook `use-assets` — nova query helper**
- `useAssetVersions(rootAssetId)` retorna todas as versões ordenadas por `version DESC`
- Resolve a raiz da cadeia (se o asset clicado já é uma versão, sobe até `parent_asset_id IS NULL`)

**6. Componente novo: `TagChipsInput`**
- Reutilizável: input com chips, sugestões, validação
- Usado no upload e no `AssetDetailDrawer` (substituir editor de tags atual se houver)

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/features/dam/components/AssetUploadDialog.tsx` | Reescrever — dropzone, lista de arquivos, modo versão |
| `src/features/dam/components/TagChipsInput.tsx` | Criar — input de tags com chips + sugestões |
| `src/features/dam/components/AssetVersionHistory.tsx` | Criar — aba de histórico de versões |
| `src/features/dam/components/AssetDetailDrawer.tsx` | Editar — botão "Nova versão" + tab versions |
| `src/features/dam/hooks/use-asset-upload.ts` | Editar — suportar `parentAsset` e versão |
| `src/features/dam/hooks/use-assets.ts` | Editar — adicionar `useAssetVersions` helper |
| `src/features/dam/pages/DamLibraryPage.tsx` | Editar — passar callback de "Nova versão" para o drawer |

### Detalhes técnicos

- **Drag-and-drop**: prevenir default em `dragover` para habilitar drop; estado `isDragging` controla classe visual (`border-primary bg-primary/5`)
- **Tag suggestions**: derivar de `assets[].tags` (já carregados via `useAssets`); passar como prop `suggestions: string[]`
- **Versionamento — raiz**: se `parentAsset.parent_asset_id` existe, usar essa raiz; senão usar `parentAsset.id` (cadeia plana, todas versões apontam para o original)
- **Query de versões**: `.or('id.eq.{root},parent_asset_id.eq.{root}')` ordenada por `version DESC`
- **Thumbnail e cores**: pipeline `processImage()` existente é reutilizado sem mudanças
- **Audit log**: já é gravado automaticamente via trigger `write_audit_log` em `assets`
- **RBAC**: botão "Nova versão" e dropzone só aparecem com `can(["owner","admin","designer"])`
- **Limites**: max 10 arquivos por batch, 20MB cada, tipos validados antes do upload

### Critérios de aceite

- Arrastar arquivos sobre o diálogo destaca a dropzone e aceita o drop
- Cada arquivo na lista mostra preview, nome, tamanho e botão para remover
- Tags são chips clicáveis com sugestões da org (autocomplete)
- Click em "Nova versão" no drawer abre o upload pré-configurado
- Nova versão grava `parent_asset_id` correto e `version = anterior + 1`
- Aba "Versões" lista todas as versões do asset com badge "atual"
- Upload em lote mostra progresso e tolera falhas individuais (uma falha não cancela as outras)

