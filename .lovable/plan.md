

## Componente de paginação reutilizável com total de resultados

Criar um `<DamPagination>` que mostre "X–Y de Z resultados", desabilite Anterior/Próximo nos limites, e use a paginação numerada existente (`buildPageList` com elipses). Substituir os 3 blocos de paginação ad-hoc atuais por esse componente.

### Arquivo novo: `src/features/dam/components/DamPagination.tsx`

Props:
- `page: number` (1-based)
- `pageSize: number`
- `total: number`
- `totalPages: number`
- `onPageChange: (page: number) => void`
- `className?: string`

Renderiza dois blocos:
1. **Contador** (à esquerda): `Mostrando <strong>{from}–{to}</strong> de <strong>{total}</strong> resultados` — quando `total === 0`, mostra "Nenhum resultado". `from = (page-1)*pageSize + 1`, `to = Math.min(page*pageSize, total)`.
2. **Controles** (à direita): usa `Pagination`/`PaginationContent`/`PaginationLink` do shadcn (`src/components/ui/pagination.tsx` já existe). Botões Anterior/Próximo com `aria-disabled` + `pointer-events-none opacity-50` quando `page === 1` ou `page === totalPages`. Páginas numeradas via helper `buildPageList(page, totalPages)` (mover de `DamLibraryPage` para dentro do componente — ou exportar de `lib/`).

Layout: `flex items-center justify-between gap-4 flex-wrap` — conta colapsa abaixo em telas estreitas.

Acessibilidade: `nav aria-label="Paginação"`, `aria-current="page"` no item ativo, `aria-disabled` real (não só visual) nos limites.

### Refatorar consumidores

**`src/features/dam/pages/DamLibraryPage.tsx`**
- Remover o `buildPageList` local e o JSX de paginação manual (modo `pages`).
- Substituir por `<DamPagination page={page} pageSize={pageSize} total={total} totalPages={totalPages} onPageChange={setPage} />` — só renderizar quando `paginationMode === "pages"` e `total > 0`.

**`src/features/dam/components/AssetPicker.tsx`**
- Substituir o rodapé com `Anterior`/`Próximo` simples por `<DamPagination />`.

**`src/features/audit/pages/AuditLogPage.tsx`**
- Atualmente mostra só Anterior/Próximo + "X de Y". Trocar pelo mesmo componente (renomeá-lo para `ResultsPagination` em `src/components/ResultsPagination.tsx` se for reutilizar fora de DAM — caso contrário, manter no folder dam e o audit faz import). **Decisão**: criar como `src/components/ResultsPagination.tsx` (genérico, sem dependência de feature) já que serve 3 lugares.

### Critérios de aceite

- Componente único `<ResultsPagination>` em `src/components/`.
- Mostra "X–Y de Z resultados" (ou "Nenhum resultado" / "Z resultados" no singular para 1 página).
- Botão Anterior desabilitado (visual + `aria-disabled` + sem clique) na página 1; Próximo idem na última.
- Links numerados com elipses para mais de ~7 páginas.
- `DamLibraryPage` (modo páginas), `AssetPicker` e `AuditLogPage` passam a usar o componente; nenhum bloco de paginação manual remanescente nesses arquivos.
- TypeScript estrito; sem regressão visual (mesmo espaçamento e altura das paginações atuais).

