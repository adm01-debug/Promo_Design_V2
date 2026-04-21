

## Botão "Escolher do DAM" no Mockup Studio

Adicionar fluxo de seleção de logo a partir da biblioteca DAM, ao lado do upload tradicional, no painel direito do editor de mockup. A logo escolhida é baixada via signed URL e injetada no pipeline existente (auto-fit + warp + drag).

### Mudanças

**`src/features/mockup/components/MockupRightPanel.tsx`**
- Importar `AssetPicker` (`@/features/dam/components/AssetPicker`), `downloadAssetAsFile` (`@/features/dam/lib/asset-urls`), `Library` icon, `toast` (sonner) e `useState`.
- Adicionar estado local `damPickerOpen`.
- Na seção "Logo" (logo card), abaixo do botão "Fazer upload", adicionar botão secundário **"Escolher do DAM"** (variant `outline`, ícone `Library`, full width).
- Quando o usuário seleciona um asset:
  1. `downloadAssetAsFile(asset.file_path, asset.name, asset.mime_type)` → retorna `File`.
  2. Em sucesso: `props.handleLogoUpload(file)` (reusa pipeline existente: preview, auto-fit, extração de cores).
  3. Em falha: `toast.error("Não foi possível carregar o asset")`.
- Filtros padrão do picker: `defaultAssetType="logo"`, `clientId={null}` (sem lock — designer pode pegar de qualquer cliente), `title="Escolher logo da biblioteca"`.

**`src/features/mockup/hooks/use-mockup-editor.ts`** — sem mudanças. `handleLogoUpload(file: File)` já cobre o fluxo completo (preview, cores, auto-fit, push history).

**`src/features/mockup/pages/MockupEditor.tsx`** — adicionar o mesmo botão "Escolher do DAM" no `EditorRightPanel` (mesmo padrão), pois é o segundo ponto onde se faz upload de logo. Reaproveita `handleLogoUpload` já presente.

**`src/features/mockup/components/EditorRightPanel.tsx`** — receber prop opcional `onPickFromDam?: () => void` ou inlinar o `AssetPicker` lá também (decisão: inlinar para manter simetria com `MockupRightPanel`).

### Critérios de aceite

- No painel direito do `MockupNew` (ao montar o mockup) e do `MockupEditor` (edição avançada), aparece botão **"Escolher do DAM"** abaixo do "Fazer upload".
- Clicar abre o `AssetPicker` com filtro padrão `asset_type=logo` e respeita os filtros persistidos do DAM (busca, cliente, tags).
- Selecionar um asset fecha o picker, baixa o arquivo via signed URL, faz auto-fit na área de impressão e a logo aparece imediatamente no canvas — pronta para drag/resize/warp.
- Erros de download mostram toast e não quebram o estado atual da edição.
- Sem regressão: upload por arquivo, drag-drop no canvas, AI remove background, suggest placement, mesh warp, export PNG/PDF e draft save continuam funcionando.

