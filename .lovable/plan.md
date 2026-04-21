

## Documentação de Funcionalidades — `FEATURES.md`

Vou gerar um documento markdown exaustivo (`/mnt/documents/PROMO_DESIGN_FEATURES.md`) catalogando todas as funcionalidades do Promo Design, com base em: rotas (`App.tsx`), navegação (`AppSidebar`), feature folders (`src/features/`), schema do banco (14 tabelas), edge function `mockup-ai`, hooks, integrações e o histórico das ondas enterprise já implementadas (Onda 1: multi-tenant + RBAC + audit; DAM + Brand Guidelines).

### Estrutura do documento

1. **Visão Geral** — propósito, stack, escopo
2. **Módulos Principais** (cada um com sub-funcionalidades, rotas, tabelas e capabilities):
   - **Dashboard** — widgets drag-and-drop, sparklines, count-up, layouts persistidos
   - **Mockup Studio** — editor visual, mesh warp, multi-view, rascunhos, histórico, AI background removal
   - **Ordens de Serviço** — CRUD, state machine (aberta/em_producao/concluida/cancelada), audit log, PDF export, dashboard analítico, realtime
   - **Catálogo** — produtos, categorias, SKU, ProductPicker, analytics
   - **Clientes (CRM)** — entidade compartilhada, contatos múltiplos, tags, busca
   - **DAM (Biblioteca de Assets)** — logos/artes/fotos/mockups, versionamento, tags GIN, cores dominantes, AssetPicker
   - **Brand Guidelines** — paleta primária/secundária, fontes, do/don't, logo principal por cliente
   - **Magic Up (IA)** — geração de imagens publicitárias, prompts inteligentes, banco de prompts, histórico, favoritos, batch variations, edge function `mockup-ai`
   - **Video Studio** — Novo Vídeo (3 etapas), Cinema Mode (LUTs), Moodboard, Photodump, Character Studio (Soul ID), Inspiração, Histórico, animações modulares
3. **Funcionalidades Transversais**
   - Multi-tenancy (organizações + roles: owner/admin/designer/approver/viewer)
   - Auditoria universal (`audit_log` + triggers)
   - Notificações (polling 15s, triggers DB)
   - Command Palette (⌘K)
   - Onboarding tour (6 etapas)
   - Atalhos de teclado
   - Dark/Light theme
   - PWA-ready, responsivo
4. **Segurança & Compliance** — RLS por organização, HIBP, signed URLs privadas, JWT em edge functions
5. **Banco de Dados** — tabela por tabela com colunas-chave e RLS resumido
6. **Integrações** — Bitrix24, n8n webhooks, Lovable AI Gateway
7. **Qualidade** — 444+ testes Vitest, Playwright E2E
8. **Roadmap das Ondas** — Onda 1 ✅, Onda 2 (em curso), Onda 3 (planejada)

### Entregável

Arquivo único `.md` em `/mnt/documents/PROMO_DESIGN_FEATURES.md`, com índice clicável, tabelas de rotas e tabelas de capabilities por módulo. Tag `<lov-artifact>` ao final para download.

Sobre o GitHub: a análise é feita 100% sobre o código fonte deste projeto (que é o que está sincronizado com o repositório GitHub via integração bidirecional). Não preciso acessar o GitHub externamente — o codebase aqui já é o estado mais recente.

