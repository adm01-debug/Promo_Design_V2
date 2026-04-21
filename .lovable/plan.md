

## Checklist de funcionalidades por módulo (com rotas e arquivos)

Documento de referência interno mapeando cada feature do app para sua rota e arquivo principal. Útil para onboarding, QA e localização rápida de código.

### Entrega

Criar **`docs/FEATURES.md`** na raiz do projeto, organizado por módulo, com tabelas markdown no formato `| Funcionalidade | Rota | Arquivo principal | Status |`.

### Estrutura do documento

**1. Dashboard & Navegação**
- Dashboard principal — `/` — `src/pages/Dashboard.tsx`
- Sidebar colapsável — (global) — `src/components/AppSidebar.tsx`
- Command Palette (⌘K) — (global) — `src/components/CommandPalette.tsx`
- Notificações (polling 15s) — (global) — `src/components/NotificationPanel.tsx`
- Onboarding tour — (global) — `src/components/OnboardingTour.tsx`
- Atalhos de teclado — (global) — `src/components/KeyboardShortcutsDialog.tsx`

**2. Autenticação & Organização**
- Login / signup / OAuth — `/auth` — `src/pages/Auth.tsx`
- Reset de senha — `/reset-password` — `src/pages/ResetPassword.tsx`
- Rota protegida — (wrapper) — `src/components/ProtectedRoute.tsx`
- Organizações + membros — `/organization` — `src/features/organization/pages/OrganizationPage.tsx`
- Configurações + diagnóstico — `/settings` — `src/pages/Settings.tsx`
- Audit log — `/audit` — `src/features/audit/pages/AuditLogPage.tsx`

**3. Mockup Studio**
- Novo mockup (3 steps) — `/mockup/new` — `src/features/mockup/pages/MockupNew.tsx`
- Drafts salvos — `/mockup/drafts` — `src/features/mockup/pages/MockupDrafts.tsx`
- Histórico — `/mockup/history` — `src/features/mockup/pages/MockupHistory.tsx`
- Editor multi-view — `/mockup/editor` — `src/features/mockup/pages/MockupEditor.tsx`
- Canvas + mesh warp — (componente) — `src/features/mockup/components/MockupCanvas.tsx`
- Hook editor (state, AI, draft) — (hook) — `src/features/mockup/hooks/use-mockup-editor.ts`

**4. Service Orders**
- Criar/editar OS — `/mockup/service-order` — `src/features/service-orders/pages/ServiceOrder.tsx`
- Lista de OS — `/mockup/service-orders` — `src/features/service-orders/pages/ServiceOrderList.tsx`
- Dashboard OS — `/mockup/service-dashboard` — `src/features/service-orders/pages/ServiceOrderDashboard.tsx`
- PDF individual — (lib) — `src/features/service-orders/lib/ServiceOrderPdf.ts`
- PDF em lote — (lib) — `src/features/service-orders/lib/ServiceOrderBatchPdf.ts`
- Realtime updates — (hook) — `src/features/service-orders/hooks/use-service-order-realtime.ts`

**5. Catálogo & Clientes**
- Catálogo de produtos — `/catalog` — `src/features/catalog/pages/CatalogPage.tsx`
- Lista de clientes — `/clients` — `src/features/clients/pages/ClientsPage.tsx`
- Brand Guidelines do cliente — `/clients/:clientId/brand` — `src/features/dam/pages/BrandGuidelinesPage.tsx`
- Resumo PDF do cliente — (lib) — `src/features/service-orders/lib/ClientSummaryPdf.ts`
- Brand Kit PDF — (lib) — `src/features/dam/lib/brand-kit-pdf.ts`

**6. DAM (Digital Asset Management)**
- Biblioteca de assets — `/dam` — `src/features/dam/pages/DamLibraryPage.tsx`
- Preview rápido — `/dam/preview` — `src/features/dam/pages/DamPreviewPage.tsx`
- Detalhe + audit trail — (drawer) — `src/features/dam/components/AssetDetailDrawer.tsx`
- Versionamento — (componente) — `src/features/dam/components/AssetVersionHistory.tsx`
- Upload com tags — (componente) — `src/features/dam/components/AssetUploadDialog.tsx`

**7. Magic Up (AI)**
- Gerar variações — `/magicup/generate` — `src/features/magic-up/pages/MagicUpGenerate.tsx`
- Galeria de prompts — `/magicup/prompts` — `src/features/magic-up/pages/MagicUpPrompts.tsx`
- Histórico — `/magicup/history` — `src/features/magic-up/pages/MagicUpHistory.tsx`
- Edge function AI — (backend) — `supabase/functions/mockup-ai/index.ts`

**8. Video Studio**
- Novo vídeo (wizard) — `/video/new` — `src/features/video/pages/VideoNew.tsx`
- Moodboard — `/video/moodboard` — `src/features/video/pages/VideoMoodboard.tsx`
- Photodump — `/video/photodump` — `src/features/video/pages/VideoPhotodump.tsx`
- Galeria — `/video/gallery` — `src/features/video/pages/VideoGallery.tsx`
- Cinema Mode (LUTs) — `/video/cinema` — `src/features/video/pages/VideoCinema.tsx`
- Character Studio — `/video/characters` — `src/features/video/pages/CharacterStudio.tsx`
- Histórico — `/video/history` — `src/features/video/pages/VideoHistory.tsx`
- Animações modulares — (pasta) — `src/features/video/components/animations/`

**9. Outros**
- Templates — `/templates` — `src/pages/Templates.tsx`
- Editor genérico — `/editor` — `src/pages/Editor.tsx`
- 404 animado — `*` — `src/pages/NotFound.tsx`

### Coluna "Status"

Todos marcados como ✅ Implementado por padrão. Você poderá editar manualmente para 🟡 Parcial / 🔴 Pendente / 🔵 Refinar conforme priorizar backlog.

### Critérios de aceite

- Arquivo `docs/FEATURES.md` criado com 9 seções e ~50 linhas de tabela.
- Cada linha tem rota exata (conforme `App.tsx`) e caminho de arquivo válido (verificável com `code--view`).
- Ordem das seções espelha a navegação do `AppSidebar`.
- Sem código novo no app — é apenas documentação consultável.

