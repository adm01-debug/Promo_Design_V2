

## AssetPicker reutilizável já existe — consolidar e documentar

O componente `src/features/dam/components/AssetPicker.tsx` **já implementa todos os requisitos pedidos**: modal com busca debounced (mínimo 3 chars), filtro por tipo (`defaultAssetType` + dropdown), filtro por cliente (com `lockClient`), filtro por tags (`TagFilter`), paginação (24/página), views grid/list, skeleton de loading, empty state, e callback `onSelect(asset)`. Já é usado em:

- `MockupRightPanel.tsx` (logo no MockupNew)
- `EditorRightPanel.tsx` (logo no MockupEditor)
- `ServiceOrder.tsx` via `ArtUploadField` (arte da OS)

Não vale recriar — vale **endurecer a API e expor barrel export** para reuso futuro consistente.

### Mudanças

**`src/features/dam/components/AssetPicker.tsx`** — pequenos refinamentos:
- Adicionar prop opcional `defaultClientId?: string | null` distinta de `clientId`/`lockClient` (hoje `clientId` faz papel duplo: pré-selecionar e travar). Refator: `clientId` continua como pré-seleção, `lockClient` continua travando o select. Comportamento atual preservado.
- Adicionar prop `multiSelect?: boolean` (default `false`) — quando `true`, troca `onSelect(asset)` por `onSelect(assets: Asset[])` via union de tipos discriminados. Header ganha contador "N selecionado(s)" + botão "Confirmar". Cards mostram checkbox no canto.
- Adicionar prop `excludeAssetIds?: string[]` para esconder assets já vinculados (útil em telas que listam múltiplos vínculos).
- Garantir foco inicial no input de busca e `ESC` fechando (já vem do Radix Dialog).
- Reset de filtros ao abrir já existe — manter.

**`src/features/dam/index.ts`** (criar se não existir, ou estender) — barrel export:
```ts
export { AssetPicker } from "./components/AssetPicker";
export { downloadAssetAsFile } from "./lib/asset-urls";
export type { Asset, AssetType, AssetFilters } from "./hooks/use-assets";
```

**Atualizar imports nos 3 consumidores existentes** para usar `@/features/dam` em vez de caminhos profundos:
- `MockupRightPanel.tsx`
- `EditorRightPanel.tsx`
- `ArtUploadField.tsx` (ou onde quer que `AssetPicker` seja importado em service-orders)

**Documentação inline** — JSDoc no topo do `AssetPicker` listando props, comportamento de `lockClient`/`clientId`/`defaultAssetType`, callback shape e exemplo curto de uso.

### API final (resumo)

```ts
interface AssetPickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId?: string | null;          // pré-seleciona cliente
  lockClient?: boolean;              // trava o select de cliente
  defaultAssetType?: AssetType;      // pré-filtra tipo
  excludeAssetIds?: string[];        // esconde assets já vinculados
  title?: string;
  multiSelect?: boolean;             // false = onSelect(asset), true = onSelect(asset[])
  onSelect: (asset: Asset | Asset[]) => void;
}
```

### Critérios de aceite

- `AssetPicker` exportado via barrel `@/features/dam` e usado por Mockup Studio (logo) e Service Order (arte) sem mudança de comportamento visível.
- Nova prop `multiSelect` funciona: clicar em cards alterna seleção, header mostra contador, botão "Confirmar" emite array.
- Nova prop `excludeAssetIds` filtra resultados client-side (sem novo round-trip).
- `lockClient` continua travando o seletor de cliente conforme já usado por Service Order.
- Busca server-side com mínimo 3 chars, paginação 24/página, filtros tipo/cliente/tags, views grid/list — todos preservados.
- Sem regressão nos 3 pontos de consumo existentes.

