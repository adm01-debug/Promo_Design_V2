# Checklist de Funcionalidades por Módulo

Mapa de referência das features do app Promo Design — rota exata e arquivo principal de implementação. Útil para onboarding, QA e localização rápida de código.

**Legenda de status:** ✅ Implementado · 🟡 Parcial · 🔴 Pendente · 🔵 Refinar

---

## 1. Dashboard & Navegação

| Funcionalidade | Rota | Arquivo principal | Status |
|---|---|---|---|
| Dashboard principal | `/` | `src/pages/Dashboard.tsx` | ✅ |
| Sidebar colapsável | (global) | `src/components/AppSidebar.tsx` | ✅ |
| Command Palette (⌘K) | (global) | `src/components/CommandPalette.tsx` | ✅ |
| Notificações (polling 15s) | (global) | `src/components/NotificationPanel.tsx` | ✅ |
| Onboarding tour | (global) | `src/components/OnboardingTour.tsx` | ✅ |
| Atalhos de teclado | (global) | `src/components/KeyboardShortcutsDialog.tsx` | ✅ |
| Dashboard analytics avançado | `/dashboard/analytics` | *(planejado)* | 🔴 |
| Widgets customizáveis (config UI) | `/dashboard/widgets` | *(planejado)* | 🔴 |

## 2. Autenticação & Organização

| Funcionalidade | Rota | Arquivo principal | Status |
|---|---|---|---|
| Login / signup / OAuth | `/auth` | `src/pages/Auth.tsx` | ✅ |
| Reset de senha | `/reset-password` | `src/pages/ResetPassword.tsx` | ✅ |
| Rota protegida | (wrapper) | `src/components/ProtectedRoute.tsx` | ✅ |
| Organizações + membros | `/organization` | `src/features/organization/pages/OrganizationPage.tsx` | ✅ |
| Configurações + diagnóstico | `/settings` | `src/pages/Settings.tsx` | ✅ |
| Audit log | `/audit` | `src/features/audit/pages/AuditLogPage.tsx` | ✅ |

## 3. Mockup Studio

| Funcionalidade | Rota | Arquivo principal | Status |
|---|---|---|---|
| Novo mockup (3 steps) | `/mockup/new` | `src/features/mockup/pages/MockupNew.tsx` | ✅ |
| Drafts salvos | `/mockup/drafts` | `src/features/mockup/pages/MockupDrafts.tsx` | ✅ |
| Histórico | `/mockup/history` | `src/features/mockup/pages/MockupHistory.tsx` | ✅ |
| Editor multi-view | `/mockup/editor` | `src/features/mockup/pages/MockupEditor.tsx` | ✅ |
| Canvas + mesh warp | (componente) | `src/features/mockup/components/MockupCanvas.tsx` | ✅ |
| Hook editor (state, AI, draft) | (hook) | `src/features/mockup/hooks/use-mockup-editor.ts` | ✅ |
| Templates de mockup salvos | `/mockup/templates` | *(planejado, hoje só `/templates` genérico)* | 🔴 |
| Comparador de versões | `/mockup/compare` | *(planejado)* | 🔴 |
| Aprovação de cliente (link público) | `/mockup/approve/:token` | *(planejado)* | 🔴 |

## 4. Service Orders

| Funcionalidade | Rota | Arquivo principal | Status |
|---|---|---|---|
| Criar/editar OS | `/mockup/service-order` | `src/features/service-orders/pages/ServiceOrder.tsx` | ✅ |
| Lista de OS | `/mockup/service-orders` | `src/features/service-orders/pages/ServiceOrderList.tsx` | ✅ |
| Dashboard OS | `/mockup/service-dashboard` | `src/features/service-orders/pages/ServiceOrderDashboard.tsx` | ✅ |
| PDF individual | (lib) | `src/features/service-orders/lib/ServiceOrderPdf.ts` | ✅ |
| PDF em lote | (lib) | `src/features/service-orders/lib/ServiceOrderBatchPdf.ts` | ✅ |
| Realtime updates | (hook) | `src/features/service-orders/hooks/use-service-order-realtime.ts` | ✅ |

## 5. Catálogo & Clientes

| Funcionalidade | Rota | Arquivo principal | Status |
|---|---|---|---|
| Catálogo de produtos | `/catalog` | `src/features/catalog/pages/CatalogPage.tsx` | ✅ |
| Lista de clientes | `/clients` | `src/features/clients/pages/ClientsPage.tsx` | ✅ |
| Brand Guidelines do cliente | `/clients/:clientId/brand` | `src/features/dam/pages/BrandGuidelinesPage.tsx` | ✅ |
| Resumo PDF do cliente | (lib) | `src/features/service-orders/lib/ClientSummaryPdf.ts` | ✅ |
| Brand Kit PDF | (lib) | `src/features/dam/lib/brand-kit-pdf.ts` | ✅ |

## 6. DAM (Digital Asset Management)

| Funcionalidade | Rota | Arquivo principal | Status |
|---|---|---|---|
| Biblioteca de assets | `/dam` | `src/features/dam/pages/DamLibraryPage.tsx` | ✅ |
| Preview rápido | `/dam/preview` | `src/features/dam/pages/DamPreviewPage.tsx` | ✅ |
| Detalhe + audit trail | (drawer) | `src/features/dam/components/AssetDetailDrawer.tsx` | ✅ |
| Versionamento | (componente) | `src/features/dam/components/AssetVersionHistory.tsx` | ✅ |
| Upload com tags | (componente) | `src/features/dam/components/AssetUploadDialog.tsx` | ✅ |

## 7. Magic Up (AI)

| Funcionalidade | Rota | Arquivo principal | Status |
|---|---|---|---|
| Gerar variações | `/magicup/generate` | `src/features/magic-up/pages/MagicUpGenerate.tsx` | ✅ |
| Galeria de prompts | `/magicup/prompts` | `src/features/magic-up/pages/MagicUpPrompts.tsx` | ✅ |
| Histórico | `/magicup/history` | `src/features/magic-up/pages/MagicUpHistory.tsx` | ✅ |
| Edge function AI | (backend) | `supabase/functions/mockup-ai/index.ts` | ✅ |

## 8. Video Studio

| Funcionalidade | Rota | Arquivo principal | Status |
|---|---|---|---|
| Novo vídeo (wizard) | `/video/new` | `src/features/video/pages/VideoNew.tsx` | ✅ |
| Moodboard | `/video/moodboard` | `src/features/video/pages/VideoMoodboard.tsx` | ✅ |
| Photodump | `/video/photodump` | `src/features/video/pages/VideoPhotodump.tsx` | ✅ |
| Galeria | `/video/gallery` | `src/features/video/pages/VideoGallery.tsx` | ✅ |
| Cinema Mode (LUTs) | `/video/cinema` | `src/features/video/pages/VideoCinema.tsx` | ✅ |
| Character Studio | `/video/characters` | `src/features/video/pages/CharacterStudio.tsx` | ✅ |
| Histórico | `/video/history` | `src/features/video/pages/VideoHistory.tsx` | ✅ |
| Animações modulares | (pasta) | `src/features/video/components/animations/` | ✅ |

## 9. Outros

| Funcionalidade | Rota | Arquivo principal | Status |
|---|---|---|---|
| Templates | `/templates` | `src/pages/Templates.tsx` | ✅ |
| Editor genérico | `/editor` | `src/pages/Editor.tsx` | ✅ |
| 404 animado | `*` | `src/pages/NotFound.tsx` | ✅ |