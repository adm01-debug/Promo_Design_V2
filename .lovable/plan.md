

## "Nova versão" no Asset Detail — já existe, falta polimento

Investiguei o código: o botão **"Nova versão"** já existe no `AssetDetailDrawer.tsx` (linha ~120) e abre o `AssetUploadDialog` em modo versionamento via prop `parentAsset`. O `useAssetUpload` já trata corretamente:

- `parentRootId = parent.parent_asset_id ?? parent.id` (encadeamento correto)
- `nextVersion = parent.version + 1`
- Nome auto-versionado (`"... v2"`)
- Reuso de `client_id`, `asset_type`, `tags` do parent
- Recálculo de `dominant_colors`, `width`, `height`, `thumbnail_path` via `processImage()`

**O que está faltando para a experiência ficar redonda:**

### Gaps identificados

1. **Sem permissão para "viewer"**: o botão só aparece para `owner/admin/designer`, mas o gating atual está OK — manter.
2. **UX do dialog em modo versão**: o `AssetUploadDialog` em modo versão ainda mostra **multi-upload** (até 10 arquivos) e seletor de **tipo/cliente**, o que é confuso — versão deveria ser **1 arquivo só** e herdar metadados.
3. **Sem feedback visual** de que está criando versão: faltam título e descrição contextuais ("Nova versão de X (atual v2 → v3)").
4. **Após criar versão, drawer não atualiza** para o novo asset — usuário fica vendo a versão antiga e precisa abrir aba "Versões" e clicar manualmente.
5. **Aba "Versões"** não destaca claramente o asset atualmente aberto (só destaca o `maxVersion`).

### Mudanças

**`AssetUploadDialog.tsx`** — quando `parentAsset` é fornecido:
- Header: `"Nova versão de {parent.name}"` + subtítulo `"v{parent.version} → v{nextVersion}"`
- Esconder seletor de **tipo** e **cliente** (herdados); mostrar como info read-only ("Tipo: arte · Cliente: Acme")
- Limitar a **1 arquivo** (drop/seleção adicional substitui o atual em vez de empilhar)
- Esconder `TagChipsInput` (herda tags); permitir expandir via "Editar metadados" colapsável (opcional, não bloqueante)
- Botão muda de "Enviar" para "Criar versão {nextVersion}"
- Após sucesso: callback `onUploaded(asset)` chamado com o novo asset

**`AssetDetailDrawer.tsx`**:
- Receber callback `onUploaded` do dialog e chamar `onSelectAsset?.(novoAsset)` para o drawer pular pra nova versão automaticamente
- Indicador no header: badge `v{asset.version}` ao lado do nome
- Toast de confirmação: `"Versão {n} criada"`

**`AssetVersionHistory.tsx`**:
- Destacar a versão **atualmente aberta** (não só a última) com ring/borda
- Mostrar diff de `dominant_colors` entre versões consecutivas (3 swatches lado a lado por linha) — opcional, leve

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/features/dam/components/AssetUploadDialog.tsx` | Editar — modo versão (header, single-file, hide selectors, callback `onUploaded`) |
| `src/features/dam/components/AssetDetailDrawer.tsx` | Editar — badge de versão no header, callback que troca o asset ativo após upload |
| `src/features/dam/components/AssetVersionHistory.tsx` | Editar — destacar asset atual aberto |

### Detalhes técnicos

- Single-file mode: `if (parentAsset && entries.length > 0) entries = [newEntry]` ao invés de `[...entries, newEntry]`; input com `multiple={!parentAsset}`
- Callback: nova prop opcional `onUploaded?: (asset: Asset) => void` no dialog; chamada após `uploadFile()` resolver com sucesso
- Drawer já tem `onSelectAsset` — reusar
- Não há mudanças no banco, hook ou RLS

### Critérios de aceite

- Clicar "Nova versão" no drawer abre dialog com header contextual ("Nova versão de X · v2 → v3")
- Dialog em modo versão aceita só 1 arquivo, sem seletores de tipo/cliente/tags
- Após upload bem-sucedido, drawer pula automaticamente para a nova versão (com nova thumbnail e cores dominantes recalculadas)
- Header do drawer mostra badge `v{n}`
- Aba "Versões" destaca o asset atualmente aberto, não só o mais recente
- Permissões inalteradas (gate por `owner/admin/designer`)
- Sem regressão no upload normal (multi-arquivo continua funcionando quando não há `parentAsset`)

