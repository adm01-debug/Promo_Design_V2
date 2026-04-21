

## Fechar escopo: adicionar rotas pendentes ao `docs/FEATURES.md`

A checklist atual cobre as rotas existentes em `App.tsx`, mas faltam **rotas/páginas planejadas** para fechar o escopo dos 5 módulos prioritários. Em vez de criar páginas vazias (que poluem o app), vamos **estender o `docs/FEATURES.md`** com uma nova seção **"Backlog de rotas planejadas"** marcando cada item como 🔴 Pendente, e adicionar as linhas faltantes nas seções existentes com status correto.

Isso mantém a doc como single source of truth do escopo total (implementado + planejado), sem inflar o bundle com páginas placeholder.

### Mudanças em `docs/FEATURES.md`

**Atualizar legenda** — manter ✅/🟡/🔴/🔵.

**Seção 1. Dashboard & Navegação** — adicionar linhas 🔴:
- `Dashboard analytics avançado` — `/dashboard/analytics` — *(planejado)* — 🔴
- `Widgets customizáveis (config UI)` — `/dashboard/widgets` — *(planejado)* — 🔴

**Seção 3. Mockup Studio** — adicionar linhas 🔴:
- `Templates de mockup salvos` — `/mockup/templates` — *(planejado, hoje só `/templates` genérico)* — 🔴
- `Comparador de versões` — `/mockup/compare` — *(planejado)* — 🔴
- `Aprovação de cliente (link público)` — `/mockup/approve/:token` — *(planejado)* — 🔴

**Seção 6. DAM** — adicionar linhas 🔴:
- `Coleções/Pastas` — `/dam/collections` — *(planejado)* — 🔴
- `Lixeira (assets arquivados)` — `/dam/trash` — *(parcial via filtro `archived`)* — 🟡
- `Busca avançada (saved searches)` — `/dam/search` — *(planejado)* — 🔴

**Seção 5. Catálogo & Clientes** — adicionar linha 🔴 para Brand:
- `Brand Guidelines — versionamento` — `/clients/:clientId/brand/history` — *(planejado)* — 🔴
- `Brand Guidelines — share público` — `/brand/public/:token` — *(planejado)* — 🔴

**Seção 7. Magic Up** — adicionar linhas 🔴:
- `Favoritos (galeria dedicada)` — `/magicup/favorites` — *(parcial via filtro em `/history`)* — 🟡
- `Batch jobs (status fila)` — `/magicup/jobs` — *(planejado)* — 🔴
- `Estilos/presets gerenciáveis` — `/magicup/styles` — *(planejado, hoje hardcoded em `MagicUpGenerate`)* — 🔴

**Nova seção 10. Backlog consolidado** — tabela resumo só com itens 🔴/🟡 acima, ordenada por prioridade sugerida (DAM Coleções → Mockup Aprovação → Brand share → Magic Up Jobs → resto), com coluna extra **"Justificativa"** explicando o gap funcional em uma linha cada.

### Critérios de aceite

- `docs/FEATURES.md` atualizado: 9 seções existentes ganham linhas 🔴/🟡 onde há gap; nova seção 10 lista 12 itens de backlog consolidados.
- Cada nova linha tem rota proposta (mesmo que ainda não exista em `App.tsx`) e marcador `*(planejado)*` no campo de arquivo.
- Itens 🟡 (parciais) referenciam a rota/arquivo onde já existe implementação parcial.
- Nenhum código novo no app — só doc. `App.tsx`, sidebar e páginas ficam intactos.
- Doc continua navegável (tabelas markdown válidas, ~75 linhas no total).

