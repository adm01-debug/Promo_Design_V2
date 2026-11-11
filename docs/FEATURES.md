# Checklist de Funcionalidades por Módulo

Mapa de referência das features do app Promo Design — rota exata e arquivo principal de implementação. Útil para onboarding, QA e localização rápida de código.

**Legenda de status:** ✅ Implementado · 🟡 Parcial · 🔴 Pendente (⬜) · 🔵 Refinar

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

---

## 1. Dashboard & Navegação

| Funcionalidade                    | Rota                   | Arquivo principal                            | Status | Observação                                                                              |
| --------------------------------- | ---------------------- | -------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| Dashboard principal               | `/`                    | `src/pages/Dashboard.tsx`                    | ✅     | —                                                                                       |
| Sidebar colapsável                | (global)               | `src/components/AppSidebar.tsx`              | ✅     | —                                                                                       |
| Command Palette (⌘K)              | (global)               | `src/components/CommandPalette.tsx`          | ✅     | —                                                                                       |
| Notificações (polling 15s)        | (global)               | `src/components/NotificationPanel.tsx`       | ✅     | —                                                                                       |
| Onboarding tour                   | (global)               | `src/components/OnboardingTour.tsx`          | ✅     | —                                                                                       |
| Atalhos de teclado                | (global)               | `src/components/KeyboardShortcutsDialog.tsx` | ✅     | —                                                                                       |
| Dashboard analytics avançado      | `/dashboard/analytics` | _(planejado)_                                | 🔴     | Widgets atuais mostram contagens; falta agregação temporal e métricas de produtividade. |
| Widgets customizáveis (config UI) | `/dashboard/widgets`   | _(planejado)_                                | 🔴     | `useWidgetLayout` persiste ordem; falta tela para adicionar/remover/configurar widgets. |

## 2. Autenticação & Organização

| Funcionalidade              | Rota              | Arquivo principal                                      | Status |
| --------------------------- | ----------------- | ------------------------------------------------------ | ------ |
| Login / signup / OAuth      | `/auth`           | `src/pages/Auth.tsx`                                   | ✅     |
| Reset de senha              | `/reset-password` | `src/pages/ResetPassword.tsx`                          | ✅     |
| Rota protegida              | (wrapper)         | `src/components/ProtectedRoute.tsx`                    | ✅     |
| Organizações + membros      | `/organization`   | `src/features/organization/pages/OrganizationPage.tsx` | ✅     |
| Configurações + diagnóstico | `/settings`       | `src/pages/Settings.tsx`                               | ✅     |
| Audit log                   | `/audit`          | `src/features/audit/pages/AuditLogPage.tsx`            | ✅     |

## 3. Mockup Studio

| Funcionalidade                      | Rota                     | Arquivo principal                                 | Status | Observação                                                                                              |
| ----------------------------------- | ------------------------ | ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| Novo mockup (3 steps)               | `/mockup/new`            | `src/features/mockup/pages/MockupNew.tsx`         | ✅     | —                                                                                                       |
| Drafts salvos                       | `/mockup/drafts`         | `src/features/mockup/pages/MockupDrafts.tsx`      | ✅     | —                                                                                                       |
| Histórico                           | `/mockup/history`        | `src/features/mockup/pages/MockupHistory.tsx`     | ✅     | —                                                                                                       |
| Editor multi-view                   | `/mockup/editor`         | `src/features/mockup/pages/MockupEditor.tsx`      | ✅     | —                                                                                                       |
| Canvas + mesh warp                  | (componente)             | `src/features/mockup/components/MockupCanvas.tsx` | ✅     | —                                                                                                       |
| Hook editor (state, AI, draft)      | (hook)                   | `src/features/mockup/hooks/use-mockup-editor.ts`  | ✅     | —                                                                                                       |
| Templates de mockup salvos          | `/mockup/templates`      | _(planejado, hoje só `/templates` genérico)_      | 🔴     | `/templates` é genérico (mock estático); falta CRUD vinculado a `mockup_drafts` com flag `is_template`. |
| Comparador de versões               | `/mockup/compare`        | _(planejado)_                                     | 🔴     | `MockupHistory` lista mockups; falta UI side-by-side com diff visual.                                   |
| Aprovação de cliente (link público) | `/mockup/approve/:token` | _(planejado)_                                     | 🔴     | Requer tabela `approval_tokens`, edge function pública e página sem auth.                               |

## 4. Service Orders

| Funcionalidade   | Rota                        | Arquivo principal                                                 | Status |
| ---------------- | --------------------------- | ----------------------------------------------------------------- | ------ |
| Criar/editar OS  | `/mockup/service-order`     | `src/features/service-orders/pages/ServiceOrder.tsx`              | ✅     |
| Lista de OS      | `/mockup/service-orders`    | `src/features/service-orders/pages/ServiceOrderList.tsx`          | ✅     |
| Dashboard OS     | `/mockup/service-dashboard` | `src/features/service-orders/pages/ServiceOrderDashboard.tsx`     | ✅     |
| PDF individual   | (lib)                       | `src/features/service-orders/lib/ServiceOrderPdf.ts`              | ✅     |
| PDF em lote      | (lib)                       | `src/features/service-orders/lib/ServiceOrderBatchPdf.ts`         | ✅     |
| Realtime updates | (hook)                      | `src/features/service-orders/hooks/use-service-order-realtime.ts` | ✅     |

## 5. Catálogo & Clientes

| Funcionalidade                   | Rota                               | Arquivo principal                                     | Status | Observação                                                                                 |
| -------------------------------- | ---------------------------------- | ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Catálogo de produtos             | `/catalog`                         | `src/features/catalog/pages/CatalogPage.tsx`          | ✅     | —                                                                                          |
| Lista de clientes                | `/clients`                         | `src/features/clients/pages/ClientsPage.tsx`          | ✅     | —                                                                                          |
| Brand Guidelines do cliente      | `/clients/:clientId/brand`         | `src/features/dam/pages/BrandGuidelinesPage.tsx`      | ✅     | —                                                                                          |
| Resumo PDF do cliente            | (lib)                              | `src/features/service-orders/lib/ClientSummaryPdf.ts` | ✅     | —                                                                                          |
| Brand Kit PDF                    | (lib)                              | `src/features/dam/lib/brand-kit-pdf.ts`               | ✅     | —                                                                                          |
| Brand Guidelines — versionamento | `/clients/:clientId/brand/history` | _(planejado)_                                         | 🔴     | Hoje sobrescreve registro único em `brand_guidelines`; falta histórico em tabela separada. |
| Brand Guidelines — share público | `/brand/public/:token`             | _(planejado)_                                         | 🔴     | Mesma infra do approval token; ainda não modelado.                                         |

## 6. DAM (Digital Asset Management)

| Funcionalidade                   | Rota               | Arquivo principal                                                                                    | Status | Observação                                                                                                                                                                                                                                                         |
| -------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Biblioteca de assets             | `/dam`             | `src/features/dam/pages/DamLibraryPage.tsx`                                                          | ✅     | —                                                                                                                                                                                                                                                                  |
| Preview rápido                   | `/dam/preview`     | `src/features/dam/pages/DamPreviewPage.tsx`                                                          | ✅     | —                                                                                                                                                                                                                                                                  |
| Detalhe + audit trail            | (drawer)           | `src/features/dam/components/AssetDetailDrawer.tsx`                                                  | ✅     | —                                                                                                                                                                                                                                                                  |
| Versionamento                    | (componente)       | `src/features/dam/components/AssetVersionHistory.tsx`                                                | ✅     | —                                                                                                                                                                                                                                                                  |
| Upload com tags                  | (componente)       | `src/features/dam/components/AssetUploadDialog.tsx`                                                  | ✅     | —                                                                                                                                                                                                                                                                  |
| Coleções/Pastas                  | `/dam/collections` | _(planejado)_                                                                                        | 🔴     | Sem tabela `collections` no schema; requer migração + UI hierárquica.                                                                                                                                                                                              |
| Lixeira (assets arquivados)      | `/dam/trash`       | _(parcial via filtro `archived` em `DamLibraryPage.tsx`)_                                            | 🟡     | Filtro `is_archived` existe; falta view dedicada com restore em lote.                                                                                                                                                                                              |
| Busca avançada (saved searches)  | `/dam`             | `src/features/dam/components/SavedSearchesMenu.tsx` + `src/features/dam/hooks/use-saved-searches.ts` | ✅     | Filtros nomeados, fixáveis e reaplicáveis em 1 clique; persistidos por usuário/organização na tabela `dam_saved_searches`.                                                                                                                                         |
| Prévia rápida (quick preview)    | `/dam`             | `src/features/dam/components/QuickPreviewPanel.tsx` + `src/features/dam/hooks/use-quick-preview.ts`  | ✅     | Painel lateral sticky com thumbnail ampliado, metadados, versão e ações; hover (debounce 150ms) ou clique para fixar. Estado persistido em `localStorage`.                                                                                                         |
| Busca por OCR (texto em imagens) | `/dam`             | `supabase/functions/asset-ocr/index.ts` + `src/features/dam/hooks/use-asset-upload.ts`               | ✅     | Extrai texto de imagens no upload via Lovable AI (Gemini 3 Flash). Busca em `/dam` e `AssetPicker` encontra pelo conteúdo interno; cards/lista mostram badge "OCR". Reprocesso manual no drawer e ação "DAM: Indexar OCR de imagens pendentes" no Command Palette. |

## 7. Magic Up (AI)

| Funcionalidade               | Rota                 | Arquivo principal                                      | Status | Observação                                                                         |
| ---------------------------- | -------------------- | ------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------- |
| Gerar variações              | `/magicup/generate`  | `src/features/magic-up/pages/MagicUpGenerate.tsx`      | ✅     | —                                                                                  |
| Galeria de prompts           | `/magicup/prompts`   | `src/features/magic-up/pages/MagicUpPrompts.tsx`       | ✅     | —                                                                                  |
| Histórico                    | `/magicup/history`   | `src/features/magic-up/pages/MagicUpHistory.tsx`       | ✅     | —                                                                                  |
| Edge function AI             | (backend)            | `supabase/functions/mockup-ai/index.ts`                | ✅     | —                                                                                  |
| Favoritos (galeria dedicada) | `/magicup/favorites` | _(parcial via filtro em `/magicup/history`)_           | 🟡     | Filtro `favorite` existe em `/magicup/history`; falta galeria com layout dedicado. |
| Batch jobs (status fila)     | `/magicup/jobs`      | _(planejado)_                                          | 🔴     | Geração é síncrona/simulada; falta fila + status async + edge function worker.     |
| Estilos/presets gerenciáveis | `/magicup/styles`    | _(planejado, hoje hardcoded em `MagicUpGenerate.tsx`)_ | 🔴     | `SAMPLE_PROMPTS` hardcoded em `mockup-types.ts`; falta CRUD por organização.       |

## 8. Video Studio

| Funcionalidade      | Rota                | Arquivo principal                              | Status |
| ------------------- | ------------------- | ---------------------------------------------- | ------ |
| Novo vídeo (wizard) | `/video/new`        | `src/features/video/pages/VideoNew.tsx`        | ✅     |
| Moodboard           | `/video/moodboard`  | `src/features/video/pages/VideoMoodboard.tsx`  | ✅     |
| Photodump           | `/video/photodump`  | `src/features/video/pages/VideoPhotodump.tsx`  | ✅     |
| Galeria             | `/video/gallery`    | `src/features/video/pages/VideoGallery.tsx`    | ✅     |
| Cinema Mode (LUTs)  | `/video/cinema`     | `src/features/video/pages/VideoCinema.tsx`     | ✅     |
| Character Studio    | `/video/characters` | `src/features/video/pages/CharacterStudio.tsx` | ✅     |
| Histórico           | `/video/history`    | `src/features/video/pages/VideoHistory.tsx`    | ✅     |
| Animações modulares | (pasta)             | `src/features/video/components/animations/`    | ✅     |

## 9. Outros

| Funcionalidade  | Rota         | Arquivo principal         | Status |
| --------------- | ------------ | ------------------------- | ------ |
| Templates       | `/templates` | `src/pages/Templates.tsx` | ✅     |
| Editor genérico | `/editor`    | `src/pages/Editor.tsx`    | ✅     |
| 404 animado     | `*`          | `src/pages/NotFound.tsx`  | ✅     |

## 10. Backlog consolidado (rotas planejadas)

Tabela resumo de gaps funcionais. Prioridade sugerida do topo (alto impacto / desbloqueia fluxos) ao fim (refinamentos).

| #   | Funcionalidade                          | Rota proposta                      | Status | Esforço | Justificativa                                                 |
| --- | --------------------------------------- | ---------------------------------- | ------ | ------- | ------------------------------------------------------------- |
| 1   | Coleções/Pastas no DAM                  | `/dam/collections`                 | 🔴     | G       | Organização hierárquica é gap crítico em libraries grandes.   |
| 2   | Aprovação de cliente (link público)     | `/mockup/approve/:token`           | 🔴     | G       | Fecha o loop de homologação sem exigir login do cliente.      |
| 3   | Brand Guidelines — share público        | `/brand/public/:token`             | 🔴     | G       | Permite enviar manual de marca sem expor a plataforma.        |
| 4   | Magic Up — Batch jobs                   | `/magicup/jobs`                    | 🔴     | G       | Visibilidade de fila para gerações longas em lote.            |
| 5   | Templates de mockup salvos              | `/mockup/templates`                | 🔴     | M       | Reuso de configurações; hoje só existe `/templates` genérico. |
| 6   | Comparador de versões de mockup         | `/mockup/compare`                  | 🔴     | M       | Facilita revisão A/B entre iterações.                         |
| 7   | Brand Guidelines — versionamento        | `/clients/:clientId/brand/history` | 🔴     | M       | Auditoria de mudanças no manual de marca.                     |
| 8   | Magic Up — estilos/presets gerenciáveis | `/magicup/styles`                  | 🔴     | M       | Hoje hardcoded; bloqueia personalização por cliente.          |
| 9   | Dashboard analytics avançado            | `/dashboard/analytics`             | 🔴     | M       | Métricas de uso e produtividade além dos widgets atuais.      |
| 10  | Lixeira DAM                             | `/dam/trash`                       | 🟡     | P       | Existe filtro `archived`, falta UI dedicada com restore.      |
| 11  | Magic Up — favoritos                    | `/magicup/favorites`               | 🟡     | P       | Existe filtro em `/magicup/history`, falta galeria dedicada.  |
| 12  | Widgets customizáveis (config UI)       | `/dashboard/widgets`               | 🔴     | P       | Hoje layout é editável inline; falta tela de gestão.          |

**Esforço:** P = até 1 dia · M = 2-4 dias · G = 5+ dias.
