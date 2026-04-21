

## Testes para tagsMode (AND/OR) e ordenação por Relevância

Cobrir dois comportamentos críticos de `useAssets` (`src/features/dam/hooks/use-assets.ts`) com testes Vitest:
1. Quando `tagsMode === "all"` usa `.contains(tags)` e quando `"any"` usa `.overlaps(tags)` — refletindo em contagens distintas.
2. Quando `sortBy === "relevance"` e `search` tem ≥3 chars, chama o RPC `search_assets_ranked` com os argumentos certos; quando search é menor ou ausente, cai no path normal sem RPC.

### Arquivo novo: `src/features/dam/hooks/__tests__/use-assets.test.ts`

Stack: Vitest + `@testing-library/react` (`renderHook`, `waitFor`) + `@tanstack/react-query` `QueryClientProvider`.

**Mocks**:
- `vi.mock("@/integrations/supabase/client", ...)` — exporta `supabase` com `from()` retornando um query builder fluente espionável (`select`, `eq`, `in`, `contains`, `overlaps`, `or`, `order`, `range`) e `rpc()` espionável. Cada chamada terminal resolve com `{ data, error, count }`.
- `vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }))`.

**Helper**: `renderUseAssets(filters)` cria um `QueryClient` novo (sem retry, sem cache entre testes) e monta o hook com `wrapper`.

**Casos**:

1. **`tagsMode "all"` → `.contains`**  
   - Configura builder para resolver com `data: [a1, a2]`, `count: 2`.  
   - `renderUseAssets({ tags: ["promo", "verao"], tagsMode: "all" })`.  
   - `await waitFor(() => result.current.isLoading === false)`.  
   - Espera: `containsSpy` chamado com `("tags", ["promo", "verao"])`; `overlapsSpy` não chamado; `result.current.total === 2`.

2. **`tagsMode "any"` → `.overlaps`**  
   - Builder resolve com `data: [a1, a2, a3, a4, a5]`, `count: 5` (mais resultados, validando que a contagem muda conforme o modo).  
   - `renderUseAssets({ tags: ["promo", "verao"], tagsMode: "any" })`.  
   - Espera: `overlapsSpy` chamado com `("tags", ["promo", "verao"])`; `containsSpy` não chamado; `result.current.total === 5`.

3. **`sortBy "relevance"` + search válido → RPC**  
   - `rpc` resolve com `data: [{ ...asset, total_count: 3, rank: 0.9 }]`.  
   - `renderUseAssets({ search: "logo azul", sortBy: "relevance", clientId: "c1", tags: ["promo"], tagsMode: "any", assetTypes: ["logo"], page: 1, pageSize: 24 })`.  
   - Espera: `rpcSpy` chamado uma vez com `"search_assets_ranked"` e args contendo `{ _org_id: "org1", _query: "logo azul", _client_id: "c1", _tags: ["promo"], _tags_mode: "any", _asset_types: ["logo"], _limit: 24, _offset: 0, _include_archived: false }`. `from()` não foi chamado. `result.current.total === 3`.

4. **`sortBy "relevance"` + search < 3 chars → fallback sem RPC**  
   - Builder resolve com `data: [], count: 0`.  
   - `renderUseAssets({ search: "ab", sortBy: "relevance" })`.  
   - Espera: `rpcSpy` não chamado; `from("assets")` foi chamado; `.order("created_at", ...)` foi chamado (substituindo `relevance` que não é coluna).

5. **`sortBy "relevance"` sem search → fallback sem RPC**  
   - Mesmo padrão do caso 4 com `search: undefined`.  
   - Espera: sem RPC, ordena por `created_at`.

### Critérios de aceite

- Arquivo passa a ser detectado por `vitest.config.ts` (já inclui `src/**/*.test.ts`).
- Os 5 casos passam isoladamente (sem dependência entre si — `vi.clearAllMocks()` em `beforeEach`).
- Cobertura efetiva: a inversão `contains` ↔ `overlaps` é validada por chamada (não só pelo total) e a escolha RPC vs builder é validada pela ausência/presença de chamada.
- Sem network real; sem hits ao Supabase; tudo em memória via mocks.
- TypeScript estrito; spies tipados como `Mock`.

