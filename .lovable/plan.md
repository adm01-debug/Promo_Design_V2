

## AssetPicker reutilizável — DAM ↔ Mockup Studio ↔ Service Order

Já existe um `AssetPicker` básico em `src/features/dam/components/AssetPicker.tsx` (modal simples com busca e grid). Vou **evoluir esse componente** para uso premium reutilizável e **integrá-lo** ao Mockup Studio (escolher logo do DAM) e à Service Order (anexar/escolher arte).

### 1. Evoluir `AssetPicker` (refactor)

- Filtros: busca (debounced 300ms), filtro por **cliente** (auto-preenche se `clientId` vier por prop), filtro por **tipo** (logo/art/photo/...), filtro por **tags** (reutilizar `TagFilter`)
- Paginação real (24 por página) usando o `useAssets` já paginado
- Toggle grid/lista (reutilizar padrão do DAM)
- Empty state + skeleton de carregamento
- Prop `assetType` agora é **default**, não trava (usuário pode mudar dentro do modal)
- Props novas:
  - `title?: string` (default "Selecionar da biblioteca")
  - `defaultAssetType?: AssetType` (filtro inicial)
  - `lockClient?: boolean` (se true, esconde o seletor de cliente)
  - `onSelect: (asset: Asset) => void` (já existe)

### 2. Integração no **Mockup Studio**

Em `MockupRightPanel.tsx`, na seção de upload de logo, adicionar botão secundário **"Escolher do DAM"** ao lado do upload de arquivo.
- Abre `AssetPicker` com `defaultAssetType="logo"` e `clientId` derivado do produto/cliente atual (se disponível) ou `null`
- Ao selecionar: baixa o arquivo do storage (signed URL via `supabase.storage.from('assets').createSignedUrl`) e injeta no editor como se fosse upload local — reutiliza `handleLogoUpload(file: File)` existente em `useMockupEditor`
- Feedback toast "Logo carregado da biblioteca"

### 3. Integração na **Service Order**

Em `ServiceOrder.tsx`, no `ArtUploadField`, adicionar botão **"Escolher do DAM"**.
- Abre `AssetPicker` com `defaultAssetType="art"` e `clientId` (derivado do `clientName` se houver match em clients, ou aberto)
- Ao selecionar: usa o `file_path` para gerar URL pública/assinada e seta em `form.artFile` + `form.artFileDataUrl`
- Toast de confirmação

### 4. Persistência da seleção (vinculação OS ↔ asset)

Hoje a OS guarda só `art_file` (nome) e `art_file_data_url` (URL). Para rastrear vinculação ao DAM:
- Adicionar coluna `art_asset_id uuid NULL` em `service_orders` (FK lógica para `assets.id`, sem constraint física para evitar bloqueio de delete)
- Quando o usuário seleciona via DAM, gravar `art_asset_id`
- Quando faz upload manual, manter `null`
- Permite no futuro: badge "vinculado à biblioteca", abrir asset original a partir da OS, atualizar arte quando uma nova versão é publicada

Para o **cliente**: nada novo necessário — `assets.client_id` já existe e o picker filtra por ele. A "memória" da seleção fica naturalmente no asset.

### 5. Edge case — assets em bucket privado

O bucket `assets` é privado. O picker e o consumo precisam usar `createSignedUrl` (válido por 1h) em vez de URL pública. Encapsular num helper `getAssetSignedUrl(filePath: string): Promise<string>` em `src/features/dam/lib/asset-urls.ts`.

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/features/dam/components/AssetPicker.tsx` | Reescrever — filtros completos, paginação, toggle |
| `src/features/dam/lib/asset-urls.ts` | Criar — helper de signed URL |
| `src/features/mockup/components/MockupRightPanel.tsx` | Editar — botão "Escolher do DAM" + abrir picker |
| `src/features/service-orders/components/ArtUploadField.tsx` | Editar — botão "Escolher do DAM" + callback |
| `src/features/service-orders/pages/ServiceOrder.tsx` | Editar — gerenciar `art_asset_id`, passar callback |
| `src/features/service-orders/hooks/use-service-orders.ts` | Editar — incluir `artAssetId` no payload |
| `src/features/service-orders/types.ts` | Editar — adicionar `artAssetId?: string \| null` |
| `supabase/migrations/<ts>_service_orders_art_asset_id.sql` | Criar — `ALTER TABLE service_orders ADD COLUMN art_asset_id uuid` |

### Detalhes técnicos

- **Carregar arquivo do DAM como `File`**: `fetch(signedUrl) → blob → new File([blob], asset.name, { type: asset.mime_type })` — assim o pipeline de upload existente (`handleLogoUpload`/`handleArtUpload`) processa sem mudanças
- **RBAC**: picker só lista assets que o usuário pode SELECT (RLS já garante via `is_member_of`)
- **Performance**: `useAssets` paginado evita carregar 1000+ assets de uma vez
- **A11y**: dialog com foco no campo de busca ao abrir; ESC fecha
- **i18n**: textos em pt-BR seguindo padrão do app

### Critérios de aceite

- Botão "Escolher do DAM" aparece no Mockup Studio (seção logo) e na Service Order (campo arte)
- Modal abre com filtro de tipo já aplicado conforme o contexto (logo/art)
- Busca, tags, cliente e paginação funcionam dentro do modal
- Selecionar um asset injeta o arquivo no editor/formulário sem reload
- OS criada via DAM grava `art_asset_id`; OS criada via upload manual mantém `art_asset_id = null`
- Bucket privado é acessado via signed URL (sem 403)

