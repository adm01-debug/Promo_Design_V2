

## Carregar arquivos do DAM via signed URL (já implementado — verificar e blindar)

O fluxo já usa signed URL: `downloadAssetAsFile` em `src/features/dam/lib/asset-urls.ts` chama `supabase.storage.from("assets").createSignedUrl(filePath, 3600)`, faz `fetch` da URL, gera um `File` com nome e mime corretos. Esse helper é usado por `MockupRightPanel`, `EditorRightPanel` e `ArtUploadField` ao selecionar do DAM. O bucket `assets` é privado — confirmado em `<storage-buckets>`.

O que falta para ficar à prova de falhas: hoje quando o signed URL falha (rede caída, expiração, RLS bloqueando), `downloadAssetAsFile` retorna `null` e os consumidores apenas exibem `toast.error` — sem distinção entre "asset não existe", "sem permissão" e "fetch falhou".

### Mudanças

**`src/features/dam/lib/asset-urls.ts`**
- `getAssetSignedUrl(filePath, expiresIn=3600)` passa a lançar `Error` com mensagem traduzida em vez de retornar `null` silenciosamente. Mantém retorno `string` em sucesso.
- `downloadAssetAsFile(filePath, name, mimeType?)`:
  - Try/catch envolvendo `getAssetSignedUrl` e `fetch`.
  - Em erro de signed URL → `throw new Error("Asset não encontrado ou sem permissão")`.
  - Em erro HTTP do fetch → `throw new Error("Falha ao baixar arquivo (HTTP NNN)")`.
  - Em erro de rede → `throw new Error("Sem conexão para baixar o asset")`.
  - Sucesso retorna `File` (sem `null`).
- Manter assinaturas exportadas via barrel `@/features/dam/index.ts` (já exporta).

**Consumidores — adaptar para o novo contrato com `try/catch`**:
- `src/features/mockup/components/MockupRightPanel.tsx` — handler do `AssetPicker.onSelect`: `try { const file = await downloadAssetAsFile(...); handleLogoUpload(file); } catch (e) { toast.error(e.message) }`.
- `src/features/mockup/components/EditorRightPanel.tsx` — mesmo padrão.
- `src/features/service-orders/components/ArtUploadField.tsx` (e/ou `ServiceOrder.tsx` `handlePickFromDam`) — mesmo padrão; preserva `artAssetId` apenas em sucesso.

**Cache opcional de signed URL (otimização leve)**
- Map em memória `Map<filePath, { url: string; expiresAt: number }>` em `asset-urls.ts`. Reusa URL se ainda restam >5min de validade. Reduz round-trips quando o usuário reabre o picker várias vezes.
- TTL alinhado ao `expiresIn` (3600s).

**Fora de escopo**
- Sem mudanças no bucket (continua privado). Sem novas RLS — o `createSignedUrl` já respeita `storage.objects` policies existentes.
- Sem mudanças no `AssetPicker` (já trabalha com `file_path`, não com URL).
- Outros pontos que já usam signed URL (`PreviewStage`, `AssetDetailDrawer`, `AssetThumbnail`) ficam como estão — o helper centralizado se beneficia automaticamente do cache se forem migrados depois.

### Critérios de aceite

- Selecionar um asset via DAM Picker (no MockupNew, MockupEditor ou Service Order) baixa o arquivo via signed URL do bucket privado `assets` e injeta no fluxo correto (logo na canvas / arte na OS).
- Falha de download mostra mensagem clara e específica (não-encontrado vs sem-rede vs HTTP-erro).
- Estado anterior do editor não quebra em caso de erro (logo/arte atual permanece).
- Reabrir o picker e selecionar o mesmo asset duas vezes em <1h reaproveita o signed URL cacheado.
- Sem regressão em `PreviewStage`, `AssetDetailDrawer`, `AssetThumbnail`, upload manual, drag-drop, AI bg-remove, export PDF/PNG, drafts.

