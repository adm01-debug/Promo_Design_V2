

## Adicionar legenda explicativa de "Rota" e "Arquivo principal" no `docs/FEATURES.md`

A legenda atual cobre só os ícones de status. Falta orientar como interpretar as duas colunas-chave.

### Mudanças em `docs/FEATURES.md`

Logo abaixo da linha **"Legenda de status: …"** (antes do `---`), adicionar dois blocos:

**Como ler a coluna "Rota":**
- Caminho iniciado por `/` (ex.: `/mockup/editor`) → rota navegável definida em `src/App.tsx`. Cole após o domínio para abrir.
- `:param` (ex.: `/clients/:clientId/brand`) → segmento dinâmico; substituir pelo ID real.
- `(global)` → componente montado em todas as rotas (sidebar, command palette, notificações).
- `(componente)` / `(hook)` / `(lib)` / `(drawer)` / `(backend)` → não tem rota própria; é importado por outras telas. O tipo entre parênteses indica a categoria do artefato.
- `*(planejado)*` → rota proposta no backlog, ainda não registrada em `App.tsx`.

**Como ler a coluna "Arquivo principal":**
- Caminho relativo à raiz do repositório (ex.: `src/features/mockup/pages/MockupEditor.tsx`) → ponto de entrada do feature. Comece a leitura por aí.
- Pastas terminadas em `/` (ex.: `src/features/video/components/animations/`) → conjunto de arquivos irmãos; abra o `index.ts` para ver os exports.
- `*(planejado)*` ou `*(parcial via …)*` → arquivo ainda não criado, ou implementação parcial referenciando o arquivo onde mora hoje.
- Convenções de pasta: `pages/` = telas com rota, `components/` = UI reutilizável, `hooks/` = lógica de estado, `lib/` = utilitários puros (PDF, parsers), `supabase/functions/` = edge functions backend.

### Critérios de aceite

- `docs/FEATURES.md` ganha 2 sub-seções de legenda imediatamente após a legenda de status, antes do primeiro `---`.
- Markdown válido (listas com `-`), sem alterar nenhuma das tabelas existentes.
- Nenhum outro arquivo é tocado.

