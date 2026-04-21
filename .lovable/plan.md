

## Status detalhado das funcionalidades + justificativas

O `docs/FEATURES.md` já tem a coluna **Status** preenchida em todas as linhas (✅/🟡/🔴) e a seção 10 com justificativas dos itens 🔴/🟡. O que falta é **explicitar por que cada item parcial/pendente está nesse estado dentro das próprias seções 1-9** (hoje a justificativa só aparece consolidada na seção 10), e **alinhar a legenda** com o símbolo ⬜ que o usuário mencionou.

### Mudanças em `docs/FEATURES.md`

**1. Atualizar legenda** — adicionar ⬜ como sinônimo aceito de 🔴 para itens nunca iniciados, mantendo 🔴 nas tabelas para consistência visual:
```
**Legenda de status:** ✅ Implementado · 🟡 Parcial · 🔴 Pendente (⬜) · 🔵 Refinar
```

**2. Adicionar coluna "Observação" nas tabelas das seções 1, 3, 5, 6 e 7** — apenas onde existem linhas 🔴/🟡. Itens ✅ ficam com observação vazia (`—`) para manter o alinhamento das colunas.

Exemplo (seção 6 DAM):

| Funcionalidade | Rota | Arquivo principal | Status | Observação |
|---|---|---|---|---|
| Biblioteca de assets | `/dam` | `src/features/dam/pages/DamLibraryPage.tsx` | ✅ | — |
| Lixeira (assets arquivados) | `/dam/trash` | *(parcial via filtro `archived` em `DamLibraryPage.tsx`)* | 🟡 | Filtro existe, falta UI dedicada com restore em lote. |
| Coleções/Pastas | `/dam/collections` | *(planejado)* | 🔴 | Sem tabela `collections` no schema; requer migração + UI hierárquica. |

**3. Justificativas a adicionar** (uma frase técnica curta cada):

- **Dashboard analytics avançado** — Widgets atuais mostram contagens; falta agregação temporal e métricas de produtividade.
- **Widgets customizáveis (config UI)** — `useWidgetLayout` persiste ordem; falta tela para adicionar/remover/configurar widgets.
- **Templates de mockup salvos** — `/templates` é genérico (mock estático); falta CRUD vinculado a `mockup_drafts` com flag `is_template`.
- **Comparador de versões** — `MockupHistory` lista mockups; falta UI side-by-side com diff visual.
- **Aprovação de cliente (link público)** — Requer tabela `approval_tokens`, edge function pública e página sem auth.
- **Brand Guidelines — versionamento** — Hoje sobrescreve registro único; falta histórico em tabela separada.
- **Brand Guidelines — share público** — Mesma infra do approval token; ainda não modelado.
- **Coleções/Pastas DAM** — Sem tabela `collections`; requer migração + UI hierárquica.
- **Lixeira DAM** — Filtro `archived` existe em `DamLibraryPage`; falta view dedicada com restore.
- **Busca avançada DAM** — Filtros são transientes; falta tabela `saved_searches`.
- **Magic Up favoritos** — Filtro `is_favorite` existe em `/magicup/history`; falta galeria com layout dedicado.
- **Magic Up batch jobs** — Geração é síncrona/simulada; falta fila + status async + edge function worker.
- **Magic Up estilos/presets** — `SAMPLE_PROMPTS` está hardcoded em `MagicUpGenerate.tsx`; falta CRUD por organização.

**4. Atualizar seção 10** — adicionar coluna "Esforço estimado" (P/M/G) ao lado de "Justificativa" para ajudar priorização:
- P (até 1 dia): Lixeira DAM, Magic Up favoritos, Widgets config UI
- M (2-4 dias): Templates de mockup, Comparador de versões, Brand versionamento, Magic Up estilos, Dashboard analytics, Busca avançada DAM
- G (5+ dias): Coleções DAM, Aprovação pública, Brand share público, Magic Up batch jobs

### Critérios de aceite

- Legenda em `docs/FEATURES.md` lista 4 estados (✅/🟡/🔴⬜/🔵) com descrição.
- Seções 1, 3, 5, 6 e 7 ganham coluna **Observação** com justificativa técnica em todos os itens 🔴/🟡 (itens ✅ recebem `—`).
- Seção 10 ganha coluna **Esforço** (P/M/G) ao lado de Justificativa, mantendo a ordem de prioridade atual.
- Documento permanece markdown válido (~95 linhas), navegável, sem código novo no app.
- Nenhum arquivo fora de `docs/FEATURES.md` é tocado.

