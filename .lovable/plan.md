

## Adicionar validações e testes para consistência do filtro de favoritos com back/forward do navegador

Garantir que ao usar os botões "voltar" e "avançar" do navegador na página `MagicUpHistory`, o estado do filtro `fav=1` (e demais filtros sincronizados na URL) permaneça consistente com o que é exibido no grid.

### Problema atual

Em `src/features/magic-up/pages/MagicUpHistory.tsx`, o estado dos filtros (`filterFavorites`, `search`, `filterProduct`, `dateFrom`, `dateTo`, `showFilters`) é inicializado **uma única vez** via `useState(() => ...)` lendo `searchParams` no mount. O `useEffect` de sincronização só escreve `state → URL`, nunca o contrário. Isso significa que ao navegar com back/forward:

- A URL muda (ex.: `?fav=1` → sem params)
- O React Router atualiza `searchParams`
- Mas o estado local não é atualizado → o grid continua mostrando o estado antigo (inconsistência)

### Mudanças propostas

#### 1. Hidratar o estado a partir da URL em mudanças de `location` (`MagicUpHistory.tsx`)

Adicionar um `useEffect` que escuta mudanças em `searchParams` e re-hidrata o estado **apenas quando a URL diverge do estado atual** (evitando o loop). Isso cobre back/forward sem reintroduzir o feedback loop que motivou a refatoração anterior.

Estratégia:
- Computar o "estado derivado da URL" a cada mudança de `searchParams`.
- Comparar campo a campo com o estado atual; só chamar setters quando houver diferença real.
- Manter o effect existente (state → URL) intacto, com a mesma comparação string-based para evitar ciclo.

#### 2. Testes unitários (`MagicUpHistory.test.tsx`)

Criar `src/features/magic-up/pages/__tests__/MagicUpHistory.test.tsx` cobrindo:

- **Hidratação inicial**: montar com `?fav=1` e verificar que o botão "Favoritos" aparece pressionado (`aria-pressed="true"`) e que o grid filtra corretamente.
- **Back/forward simulado**: usar `MemoryRouter` + manipular o histórico (`window.history.back/forward` ou re-render com nova `initialEntries`) para validar:
  - URL `?fav=1` → estado sincroniza, botão pressionado, grid filtrado.
  - Voltar para URL sem params → estado limpo, botão não pressionado, grid mostra todos os itens.
  - Avançar de novo para `?fav=1` → estado volta a aplicar o filtro.
- **Limpar filtros**: clicar em "Limpar filtros" remove `fav=1` da URL e o grid mostra todos.
- **Sem loop**: garantir que hidratar a partir da URL não dispara escrita redundante (verificar via spy em `setSearchParams` ou contagem de re-renders).

Mockar `useMagicUpHistory` para retornar uma lista controlada com itens `favorite: true` e `false`.

#### 3. Teste E2E Playwright (`e2e/magic-up-history-back-forward.spec.ts`)

Criar um spec que:
- Faz login (reutilizando helpers de `e2e/auth.spec.ts` se existirem).
- Navega para `/magic-up/history?fav=1` → valida URL e contagem do grid (`X de Y`).
- Navega para `/magic-up/history` (sem params) via `page.goto` ou click em "Limpar filtros" → valida estado limpo.
- Usa `page.goBack()` → valida que `?fav=1` retorna E que o grid reflete o filtro.
- Usa `page.goForward()` → valida que volta ao estado limpo.
- Repete o ciclo back/forward 2-3 vezes para garantir estabilidade.

### Arquivos afetados

- **Modificar**: `src/features/magic-up/pages/MagicUpHistory.tsx` (adicionar effect de URL → state).
- **Criar**: `src/features/magic-up/pages/__tests__/MagicUpHistory.test.tsx`.
- **Criar**: `e2e/magic-up-history-back-forward.spec.ts`.

### Detalhes técnicos do effect URL → state

```typescript
// Hidrata o estado a partir da URL quando ela muda externamente (back/forward, links).
// Compara campo a campo para só atualizar o que mudou — evita re-renders e loop com o
// effect inverso (state → URL), que já tem guarda baseada em string.
useEffect(() => {
  const urlFav = searchParams.get("fav") === "1";
  const urlSearch = searchParams.get("q") ?? "";
  const urlProduct = searchParams.get("product");
  const urlFrom = searchParams.get("from");
  const urlTo = searchParams.get("to");
  const urlFilters = searchParams.get("filters") === "1";

  if (urlFav !== filterFavorites) setFilterFavorites(urlFav);
  if (urlSearch !== search) setSearch(urlSearch);
  if ((urlProduct ?? null) !== filterProduct) setFilterProduct(urlProduct);
  // ...mesmo padrão para datas e showFilters
}, [searchParams]);
```

A guarda "só seta se diferente" + a guarda string-based no effect inverso garantem que não haja loop: a primeira hidratação dispara setters, que disparam o effect inverso, que vê `desired === current` e retorna sem chamar `setSearchParams`.

