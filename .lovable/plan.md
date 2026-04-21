

## Botão "Atualizar para versão mais recente" na OS

Quando uma OS tem `artAssetId` vinculado ao DAM, detectar se existe versão mais nova na cadeia do asset e oferecer um botão para sincronizar a arte automaticamente. O vínculo `art_asset_id` é atualizado para apontar à nova versão; o histórico do DAM (`AssetVersionHistory` + `audit_log`) preserva tudo.

### Como funciona

1. Em `ServiceOrder.tsx`, quando `form.artAssetId` existir, buscar a versão atual do asset (`assets` por id) e a versão mais nova da cadeia (root = `parent_asset_id ?? id`, ordenar `version desc`, pegar primeiro).
2. Se `latest.id !== form.artAssetId` → mostrar banner discreto acima do `ArtUploadField`:
   > "Nova versão disponível: **v3** (subida há 2h por João). [Atualizar arte]"
3. Clicar em **Atualizar arte** → `downloadAssetAsFile(latest.file_path, ...)` → `handleArtUpload(file)` → `setForm({ artAssetId: latest.id })` → toast "Arte atualizada para v3".
4. O usuário ainda precisa clicar **Salvar** na top bar para persistir (mantém o fluxo atual de saved/dirty).

### Mudanças

**`src/features/dam/hooks/use-assets.ts`** — exportar/criar hook leve:
- `useLatestAssetVersion(assetId: string | null)` → reutiliza `useAssetVersions` se possível, ou faz query nova: busca o asset por id, calcula `rootId = parent_asset_id ?? id`, retorna `{ current, latest, hasUpdate }` (todos `Asset | null`). Cache por `["asset-latest", rootId]`.

**Novo `src/features/service-orders/components/AssetVersionUpdateBanner.tsx`**
- Props: `currentAssetId: string | null`, `onUpdate: (file: File, newAssetId: string) => Promise<void>`.
- Usa `useLatestAssetVersion`. Se `!hasUpdate` ou sem permissão para editar → renderiza `null`.
- Mostra card com: ícone `RefreshCw`, "Nova versão **vN** disponível", autor (`shortId(created_by)`) + data relativa (`date-fns/formatDistanceToNow`), botão **"Atualizar arte"** (loading state durante download).
- Em erro, toast com mensagem do `downloadAssetAsFile`; estado anterior preservado.

**`src/features/service-orders/pages/ServiceOrder.tsx`**
- Renderizar `<AssetVersionUpdateBanner currentAssetId={form.artAssetId} onUpdate={handleVersionUpdate} />` logo acima do `ArtUploadField`.
- `handleVersionUpdate(file, newId)` → `await handleArtUpload(file); setForm(prev => ({ ...prev, artAssetId: newId })); setSaved(false);`.

**`src/features/dam/index.ts`** — exportar `useLatestAssetVersion`.

### Critérios de aceite

- Abrir OS com `artAssetId` apontando à v1 quando v2 existe → banner aparece com label "Nova versão v2 disponível".
- Clicar "Atualizar arte" → arte da OS é substituída pelo arquivo da v2, `artAssetId` aponta à v2, badge `saved` vira `false`.
- Salvar a OS → `art_asset_id` no DB atualiza para v2; reabrir a OS confirma persistência.
- OS sem `artAssetId` ou já na versão mais nova → banner não aparece.
- Erro de download (rede/permissão) → toast claro, OS continua na versão antiga sem corromper estado.
- Histórico do DAM (`AssetVersionHistory`, audit log) não é afetado — só o ponteiro da OS muda.

