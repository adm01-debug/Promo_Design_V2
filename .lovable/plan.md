

## Novas opções de ordenação no DAM: tamanho (asc) e última modificação

Hoje a lista de ordenações em `useDamFilters` (`SORT_OPTIONS`) tem "Maior arquivo" mas não "Menor arquivo", e ordena por `created_at` mas não por `updated_at`. Adicionar 2 novas opções para cobrir os casos pedidos.

### Mudanças

**`src/features/dam/hooks/use-dam-filters.ts`**
- Estender o tipo `SortValue` com:
  - `"size_asc"` — Menor arquivo
  - `"updated_desc"` — Modificados recentemente
  - `"updated_asc"` — Modificados há mais tempo
- Adicionar entradas correspondentes em `SORT_OPTIONS`:
  - `{ value: "size_asc", label: "Menor arquivo", sortBy: "file_size", sortDir: "asc" }`
  - `{ value: "updated_desc", label: "Modificados recentemente", sortBy: "updated_at", sortDir: "desc" }`
  - `{ value: "updated_asc", label: "Modificados há mais tempo", sortBy: "updated_at", sortDir: "asc" }`
- Manter ordem visual: relevância → criação → nome → tamanho (desc, asc) → modificação (desc, asc) → versão.

**`src/features/dam/hooks/use-assets.ts`**
- Estender o tipo `sortBy` em `AssetFilters` para aceitar `"updated_at"` (além dos atuais `"created_at" | "name" | "file_size" | "version" | "relevance"`).
- O branch sem RPC já passa `sortBy` direto para `.order(...)`, então basta o tipo aceitar — `updated_at` existe na tabela.
- Para o branch RPC (`relevance`), nada muda: as novas opções não usam relevance.

**`docs/FEATURES.md`**
- Atualizar a observação da linha de ordenação na seção 6 mencionando as novas opções (tamanho asc + modificação asc/desc), se já houver linha; senão deixar como está.

### Critérios de aceite

- O `Select` de ordenação no header de `/dam` (e no `PreviewSidebar`) mostra as 3 novas opções sem quebra de layout.
- Selecionar "Menor arquivo" lista do menor `file_size` ao maior; "Modificados recentemente" ordena por `updated_at` desc.
- A seleção persiste em URL (`?sort=…`) e localStorage como já acontece.
- Saved searches existentes continuam válidas (valores antigos seguem aceitos pelo `VALID_SORTS` estendido).
- TypeScript estrito sem erros (tipo `sortBy` em `AssetFilters` aceita `updated_at`).

