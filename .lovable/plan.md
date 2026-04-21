

## DAM — Busca e filtros avançados (tags múltiplas, tipo, ordenação por relevância)

A maior parte da infraestrutura já existe (trigram + GIN index, paginação, sort por data/nome/tamanho/versão). Vou **acrescentar 4 melhorias focadas em velocidade de localização**:

### O que vai mudar

**1. Tags múltiplas com modo AND/OR**
- O `TagFilter` atual usa contains (AND implícito). Adicionar toggle "Todas as tags / Qualquer tag" no filtro
- AND → operador `cs` (contains) no Postgres
- OR → operador `ov` (overlaps)
- Indicador visual do modo ativo + chip-counter ("3 tags · Todas")

**2. Multi-seleção de tipos de asset**
- Hoje o filtro de tipo é único (logo OU art OU foto...). Trocar por **multi-select** com checkboxes
- Badges no topo continuam funcionando, mas viram toggle (clique adiciona/remove)
- Query passa a usar `.in('asset_type', selectedTypes)` quando >1

**3. Ordenação por relevância (quando há busca textual)**
- Quando o campo de busca está preenchido, adicionar opção **"Relevância"** no select de sort
- Usa `similarity(name, query)` do `pg_trgm` como score (RPC nova `search_assets_ranked`) para ranquear por proximidade
- Quando busca está vazia, "Relevância" some e cai pro default "Mais recentes"

**4. Barra de filtros ativos (chips removíveis)**
- Logo abaixo da search bar, mostrar todos os filtros aplicados como chips:
  - "Tipo: Logo, Foto ×"
  - "Cliente: Acme ×"
  - "Tags: brand, hero (Todas) ×"
  - "Busca: capacete ×"
- Botão "Limpar tudo" no final
- Cada chip removível individualmente

### Detalhes técnicos

- **RPC nova** `search_assets_ranked(org_id, query, ...)`: `SELECT *, similarity(name, query) + 0.3*similarity(coalesce(description,''), query) AS rank FROM assets WHERE ... ORDER BY rank DESC` — usa o índice trigram já existente
- **`useAssets`**: estender `AssetFilters` com `assetTypes?: AssetType[]` (substitui gradualmente `assetType`), `tagsMode?: "all" | "any"`, sort `"relevance"`
- **Persistência**: salvar `tagsMode` em localStorage (`dam-tags-mode`), default "all"
- **A11y**: chips com `aria-label="Remover filtro X"`, toggle AND/OR como `role="radiogroup"`
- **Performance**: query continua paginada server-side; relevance só ativa quando há texto (evita ordenação cara em listagens vazias)

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<ts>_search_assets_ranked.sql` | Criar — RPC `search_assets_ranked` |
| `src/features/dam/hooks/use-assets.ts` | Editar — `assetTypes[]`, `tagsMode`, sort `relevance`, branch para RPC quando relevance |
| `src/features/dam/components/TagFilter.tsx` | Editar — toggle AND/OR + counter |
| `src/features/dam/components/ActiveFiltersBar.tsx` | Criar — chips de filtros ativos |
| `src/features/dam/pages/DamLibraryPage.tsx` | Editar — multi-select de tipos, integrar ActiveFiltersBar, sort com Relevância condicional |

### Critérios de aceite

- Toggle "Todas / Qualquer tag" muda comportamento da query (verificável por contagem diferente de resultados)
- Selecionar 2+ tipos no filtro lista assets de qualquer tipo selecionado
- Com busca preenchida, opção "Relevância" aparece no sort e ranqueia matches mais próximos primeiro
- Barra de filtros ativos mostra todos os filtros como chips removíveis
- Botão "Limpar tudo" reseta busca, tipos, cliente, tags e tagsMode
- Sem regressões nas otimizações já existentes (trigram, GIN, paginação)

