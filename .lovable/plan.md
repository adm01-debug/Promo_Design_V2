

## Ordenação na DAM — já implementada

Verifiquei o código e essa feature **já está 100% implementada**, com todas as opções pedidas e aplicação no servidor.

### O que já existe hoje

**Dropdown visível** em duas telas:
- `DamLibraryPage` (linha 343): `<Select value={sort} onValueChange={setSort}>` no header de filtros
- `PreviewSidebar` (DAM Preview): mesmo dropdown na sidebar lateral

**Opções disponíveis** (`SORT_OPTIONS`):
1. Relevância (só aparece quando há busca ativa)
2. **Mais recentes** (`created_at desc`) — default
3. **Mais antigos** (`created_at asc`)
4. **Nome A→Z** (`name asc`)
5. **Nome Z→A** (`name desc`)
6. **Maior arquivo** (`file_size desc`)
7. **Versão** (`version desc`)

**Aplicação no back-end** em `use-assets.ts`:
- Para ordenações normais: `supabase.from("assets").order(sortBy, { ascending: sortDir === "asc" })` — Postgres faz a ordenação antes de aplicar `range(from, to)`, então a paginação respeita o sort.
- Para relevância: chama o RPC `search_assets_ranked` que ordena por `rank DESC, created_at DESC` no servidor.

**Persistência**:
- Estado sincronizado com `?sort=` na URL (compartilhável)
- Reset automático para página 1 ao trocar ordenação
- Fallback: se "relevância" estiver selecionado e o usuário limpar a busca, volta para "Mais recentes"

### Conclusão

Nenhuma mudança de código é necessária. Se você está vendo algum comportamento estranho (ex.: o dropdown não aparece, ou a ordenação não muda os resultados), me diga qual tela e qual opção, que eu investigo o caso específico.

