

## Persistir filtros da DAM ao sair e voltar

Hoje `pageSize`, `tagsMode`, `includeArchived`, `viewMode` e `paginationMode` já sobrevivem em localStorage. Mas **busca, tipos, cliente, tags e ordenação só vivem na URL** — ao clicar em "DAM" na sidebar (que vai para `/dam` sem querystring), tudo zera. Vou estender a persistência para esses cinco filtros.

### Mudanças

**`src/features/dam/pages/DamLibraryPage.tsx`** — adicionar chaves localStorage e fallback no estado inicial:

- Novas constantes:
  - `SEARCH_KEY = "dam-search"`
  - `ASSET_TYPES_KEY = "dam-asset-types"`
  - `CLIENT_ID_KEY = "dam-client-id"`
  - `TAGS_KEY = "dam-tags"`
  - `SORT_KEY = "dam-sort"`

- **Inicialização**: cada `useState` lê primeiro da URL; se ausente, lê do localStorage; se ausente, default. Mesmo padrão já usado em `tagsMode`/`includeArchived`.

- **Persistência**: novo `useEffect` por filtro escrevendo no localStorage quando muda. Strings vazias → `removeItem` para não vazar lixo.

- **Hidratação na URL**: quando o estado é restaurado do localStorage (e a URL está vazia), o `useEffect` que sincroniza com a URL já popula os params automaticamente — comportamento desejado para que a URL fique compartilhável imediatamente.

- **Reset**: o botão "Limpar tudo" do `ActiveFiltersBar` deve agora **também** apagar as chaves de localStorage dos filtros (não da `pageSize`/`viewMode`/`paginationMode`, que são preferências de UI, não filtros). Implementar `clearAllFilters()` que zera estado E remove as 5 chaves.

**`src/features/dam/hooks/use-dam-filters.ts`** (usado por `DamPreviewPage` e `PreviewSidebar`):

- Mesma estratégia: ler do localStorage (mesmas chaves) como fallback quando a URL não tem o parâmetro. Assim a Preview também herda os filtros que estavam na biblioteca, e vice-versa.

- O `reset()` também limpa as chaves de localStorage.

### Critérios de aceite

- Filtrar por cliente "ACME", busca "logo azul", tipo "Logos", tag "verão" e sort "Nome A→Z" na DAM → navegar para `/catalog` → clicar em "DAM" na sidebar → todos os 5 filtros voltam exatamente como estavam, mesmo sem querystring na URL.
- `pageSize` selecionado (ex.: 96) também sobrevive — já funciona, mantido.
- Compartilhar URL com `?q=&type=&...` continua tendo prioridade sobre localStorage (URL ganha do storage).
- Limpar filtros ("Limpar tudo") apaga tanto o estado quanto as chaves no localStorage — recarregar a página NÃO traz os filtros antigos de volta.
- Preview (`/dam/preview`) e biblioteca (`/dam`) compartilham as mesmas chaves de localStorage, então os filtros se mantêm consistentes ao alternar entre as telas.
- Sem regressão: paginação, busca server-side com mínimo de 3 chars, índices trigram, auditoria por versão, retry de upload continuam funcionando.

