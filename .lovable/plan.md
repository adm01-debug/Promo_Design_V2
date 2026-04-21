

## Checklist de funcionalidades por módulo

Vou gerar um documento `.docx` com checklist organizada por módulo, mapeando cada funcionalidade à(s) rota(s) e arquivo(s) que a implementam. Saída em `/mnt/documents/`.

### Estrutura do documento

**Capa + sumário** com 5 seções (uma por módulo). Cada seção contém uma tabela com 4 colunas:

| Funcionalidade | Status | Rota(s) | Arquivo principal |
|---|---|---|---|

Status usa ícone: ✅ implementado · 🟡 parcial · ⬜ pendente.

### Conteúdo (resumo do que vai listar)

**1. DAM — Digital Asset Management** (`/dam`)
- Upload drag-and-drop com tags · multi-arquivo · progresso · tolerância a falhas
- Versionamento (`parent_asset_id`, `version`) · aba "Versões" no drawer
- Busca server-side (trigram) · filtro por tags (GIN) · cliente · tipo · arquivados
- Sort configurável (data/nome/tamanho/versão) · paginação · page-size persistido
- Toggle grid/lista · detalhes em drawer · download via signed URL
- AssetPicker reutilizável (usado em Mockup e OS)

**2. Brand Guidelines** (`/clients/:clientId/brand`)
- Editor de paleta primária e secundária · color picker
- Lista de fontes (nome/uso/source)
- Regras Do/Don't (textarea + chips deletáveis)
- Logo principal via AssetPicker
- Copy hex ao clicar · badge WCAG AA/AAA/FAIL
- Google Fonts dinâmico no preview
- Abas "Card de marca" e "Aplicação completa"
- Exportar PDF (`brand-kit-{cliente}.pdf`)
- RBAC: edição gated em owner/admin/designer

**3. Mockup Studio** (`/mockup/*`)
- Wizard 3 passos: produto → área → canvas (`/mockup/new`)
- Drafts com restore (`/mockup/drafts`)
- Histórico (`/mockup/history`)
- Editor multi-view (`/mockup/editor`)
- Upload de logo · "Escolher do DAM" via AssetPicker
- AI: remover background · sugerir posicionamento
- Mesh warp por superfície · blend modes · sombra
- Auto-fit · perspective presets · undo/redo
- Export PNG/JPEG/WebP/PDF de aprovação
- Service Order vinculada (`/mockup/service-order`, `/mockup/service-orders`, `/mockup/service-dashboard`)

**4. Magic Up — AI Imagery** (`/magicup/*`)
- Geração com prompt manual ou smart (`/magicup/generate`)
- Prompt bank com categorias (`/magicup/prompts`)
- Histórico com favoritos · filtros · charts (`/magicup/history`)
- Product picker integrado · variantes
- Inspiration gallery
- Download menu

**5. Dashboard** (`/`)
- Saudação dinâmica · greeting + nome
- Widgets reordenáveis (dnd-kit) com layout persistido
- Estatísticas: OS, em produção, imagens IA, rascunhos
- Gráfico semanal · heatmap mensal
- Projetos recentes (drafts + OS + magic up unificados)
- Toggle grid/lista · seletor de colunas
- Modo "Personalizar" · reset de layout
- Tour de onboarding · command palette (⌘K)

### Geração

Script Node usando `docx` (já no skill DOCX) → arquivo único `checklist-funcionalidades.docx` em `/mnt/documents/`. Após gerar, converter para PDF via LibreOffice e fazer QA visual de cada página antes de entregar.

### Arquivos a produzir

- `/mnt/documents/checklist-funcionalidades.docx` — entrega principal
- `<lov-artifact>` tag para o usuário baixar

