

## "Mostrar arquivados" — já existe, precisa de polimento

O toggle **já existe** em `DamLibraryPage.tsx` (Switch "Arquivados" na barra de filtros) e funciona: alimenta `includeArchived` no filtro do `useAssets`, aparece como chip na `ActiveFiltersBar`, e o `AssetCard`/`AssetListView` já marcam visualmente arquivados com badge "Arquivado".

O que falta para a feature ficar redonda:

### Gaps

1. **Não persiste** entre sessões (sempre volta para `false` ao recarregar) — os outros toggles (`viewMode`, `pageSize`, `tagsMode`) já persistem em localStorage; este foi esquecido.
2. **Não sincroniza com URL** — o `Link` para `/dam/preview` já passa `archived=1`, mas o estado inicial em `DamLibraryPage` não lê da URL (filtros não compartilháveis).
3. **Sem indicador no contador** — quando arquivados estão visíveis, "Mostrando 24 de 87" não distingue ativos vs arquivados; ajudaria mostrar "(inclui X arquivados)".
4. **Visual do toggle pouco descobrível** — fica espremido entre `pageSize` e o `ToggleGroup`; merece um label mais claro com ícone (Archive).

### Mudanças

**`DamLibraryPage.tsx`**:
- Adicionar `INCLUDE_ARCHIVED_KEY = "dam-include-archived"` e ler da URL (`?archived=1`) com fallback para `localStorage`
- Persistir mudanças em `localStorage` via `useEffect` (mesmo padrão dos outros toggles)
- Sincronizar com URL via `useSearchParams` (set/delete `archived`)
- Trocar o Switch por um `Toggle` (shadcn) com ícone `Archive` da lucide e label "Arquivados", visualmente alinhado com o `ToggleGroup` de view mode
- No contador de resultados, quando `includeArchived` está ativo, anexar "(N arquivados)" baseado em `assets.filter(a => a.is_archived).length` da página atual

**`use-assets.ts`**:
- Já retorna `is_archived` no row; sem mudanças

**`AssetCard.tsx`** / **`AssetListView.tsx`**:
- Já mostram badge "Arquivado"; sem mudanças

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/features/dam/pages/DamLibraryPage.tsx` | Editar — persistência localStorage + URL sync + Toggle visual + contador enriquecido |

### Detalhes técnicos

- Reusa `useSearchParams` (já importado indiretamente via Link) — adicionar import direto
- `INCLUDE_ARCHIVED_KEY` segue convenção dos outros (`VIEW_MODE_KEY`, `PAGE_SIZE_KEY`, `TAGS_MODE_KEY`)
- Estado inicial: `urlParams.get("archived") === "1" ?? localStorage ?? false`
- Toggle component: `<Toggle pressed={includeArchived} onPressedChange={setIncludeArchived}>` com `<Archive className="w-4 h-4 mr-2" /> Arquivados`
- Contador: `{includeArchived && archivedCount > 0 && ` · ${archivedCount} arquivado${archivedCount > 1 ? "s" : ""}`}`
- Sem mudanças no banco, RLS, ou hook de query

### Critérios de aceite

- Toggle "Arquivados" persiste entre reloads (localStorage)
- URL `?archived=1` ativa o toggle ao abrir
- Mudar o toggle atualiza URL (compartilhável)
- Contador mostra "Mostrando X de Y · N arquivados" quando ativo
- Visual do toggle mais descobrível (ícone + label)
- Chip "Arquivados incluídos" e botão "Limpar filtros" continuam funcionando
- Sem regressão na lista, paginação, ou filtros existentes

