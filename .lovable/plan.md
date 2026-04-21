

## Contador, empty state com CTA e skeleton melhorado

O contador "Mostrando X–Y de Z" já existe (linhas 519–535) e está correto. Falta polir três coisas: **(1)** distinguir "vazio porque filtros ativos" de "vazio porque biblioteca zerada", **(2)** dar CTA "Limpar filtros" no primeiro caso e "Fazer upload" no segundo, **(3)** skeleton respeitando `viewMode` (lista vs grid) e `pageSize` (em vez de 10 fixos).

### Mudanças

**`src/features/dam/pages/DamLibraryPage.tsx`**

- Computar `hasActiveFilters` (true se houver `debouncedSearch≥3`, `assetTypes.length`, `clientId !== "all"`, `selectedTags.length` ou `includeArchived`).

- Computar `clearAllFilters()` reaproveitando o handler já existente em `ActiveFiltersBar.onClearAll` — extrair para função local.

- **Contador**: melhorar com `Badge`/separadores e ícone sutil. Manter formato `"Mostrando X–Y de Z assets"` com pluralização correta. Quando há filtros ativos, mostrar `"Filtrado de Z assets"` ou similar para deixar claro que é resultado de filtro.

- **Skeleton aprimorado** — substituir o atual:
  ```tsx
  {isLoading && displayedAssets.length === 0 ? (
    viewMode === "list" ? (
      <div className="space-y-2">
        {Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    )
  ) : ...}
  ```

- **Empty state com CTA** — substituir o `<Card>` de "Nenhum asset encontrado" por um `EmptyState` rico (usar componente `EmptyState` já existente em `src/components/EmptyState.tsx` ou inlinar):
  - Se `hasActiveFilters`: ícone `FilterX` (lucide), título "Nenhum asset corresponde aos filtros", descrição "Tente remover algum filtro ou ajustar a busca.", botão **"Limpar filtros"** que chama `clearAllFilters()`.
  - Se `!hasActiveFilters` e `total === 0`: ícone `FolderArchive`, título "Sua biblioteca está vazia", descrição "Faça upload do seu primeiro asset para começar.", botão **"Fazer upload"** que abre o `AssetUploadDialog` (apenas se `can(["owner","admin","designer"])`).
  - Animação sutil com `motion.div` (fade + lift) para combinar com o restante da app.

- Importar `FilterX` de `lucide-react`.

### Critérios de aceite

- Contador "Mostrando X–Y de Z assets" continua correto em modo paginado e modo "carregar mais"; pluralização funciona (`asset` / `assets`).
- Loading inicial mostra skeleton com **número de placeholders próximo do `pageSize`** (capped em 10/8) e respeitando `viewMode` (linhas horizontais em lista, cards quadrados em grid com placeholder de título).
- Loading durante "carregar mais" não troca o conteúdo já visível pelo skeleton — apenas o spinner do botão (já implementado).
- Empty state com filtros ativos mostra ícone `FilterX` + texto + botão **"Limpar filtros"** que zera estado E localStorage (reusa `clearAllFilters`).
- Empty state sem filtros (biblioteca vazia) mostra `FolderArchive` + texto + botão **"Fazer upload"** que abre o `AssetUploadDialog` (oculto para `viewer`/`approver`).
- `PreviewSidebar` (DAM Preview) NÃO precisa mudar — já tem contador próprio e botão "Limpar filtros".
- Sem regressão: paginação, sort, busca trigram, persistência de filtros, auditoria por versão continuam funcionando.

