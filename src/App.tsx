import { Suspense } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import OnlineIndicator from "@/components/OnlineIndicator";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import ModuleErrorBoundary from "@/components/ModuleErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

/** Envelopa lazy element em ModuleErrorBoundary — isolamento por feature. */
const guard = (moduleName: string, node: React.ReactNode) => (
  <ModuleErrorBoundary moduleName={moduleName}>{node}</ModuleErrorBoundary>
);

const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const CatalogPage = lazyWithRetry(() => import("./features/catalog/pages/CatalogPage"));
const MockupNew = lazyWithRetry(() => import("./features/mockup/pages/MockupNew"));
const MockupDrafts = lazyWithRetry(() => import("./features/mockup/pages/MockupDrafts"));
const MockupHistory = lazyWithRetry(() => import("./features/mockup/pages/MockupHistory"));
const MockupEditor = lazyWithRetry(() => import("./features/mockup/pages/MockupEditor"));
const MagicUpGenerate = lazyWithRetry(() => import("./features/magic-up/pages/MagicUpGenerate"));
const MagicUpPrompts = lazyWithRetry(() => import("./features/magic-up/pages/MagicUpPrompts"));
const MagicUpHistory = lazyWithRetry(() => import("./features/magic-up/pages/MagicUpHistory"));
const VideoNew = lazyWithRetry(() => import("./features/video/pages/VideoNew"));
const VideoHistory = lazyWithRetry(() => import("./features/video/pages/VideoHistory"));
const VideoMoodboard = lazyWithRetry(() => import("./features/video/pages/VideoMoodboard"));
const VideoPhotodump = lazyWithRetry(() => import("./features/video/pages/VideoPhotodump"));
const VideoGallery = lazyWithRetry(() => import("./features/video/pages/VideoGallery"));
const VideoCinema = lazyWithRetry(() => import("./features/video/pages/VideoCinema"));
const CharacterStudio = lazyWithRetry(() => import("./features/video/pages/CharacterStudio"));
const ServiceOrder = lazyWithRetry(() => import("./features/service-orders/pages/ServiceOrder"));
const ServiceOrderList = lazyWithRetry(() => import("./features/service-orders/pages/ServiceOrderList"));
const ServiceOrderDashboard = lazyWithRetry(() => import("./features/service-orders/pages/ServiceOrderDashboard"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Templates = lazyWithRetry(() => import("./pages/Templates"));
// Editor page removed in favor of MockupEditor
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const OrganizationPage = lazyWithRetry(() => import("./features/organization/pages/OrganizationPage"));
const ClientsPage = lazyWithRetry(() => import("./features/clients/pages/ClientsPage"));
const AuditLogPage = lazyWithRetry(() => import("./features/audit/pages/AuditLogPage"));
const AuditEventDetailPage = lazyWithRetry(() => import("./features/audit/pages/AuditEventDetailPage"));
const DamLibraryPage = lazyWithRetry(() => import("./features/dam/pages/DamLibraryPage"));
const DamPreviewPage = lazyWithRetry(() => import("./features/dam/pages/DamPreviewPage"));
const BrandGuidelinesPage = lazyWithRetry(() => import("./features/dam/pages/BrandGuidelinesPage"));
const ArchitectureDocs = lazyWithRetry(() => import("./pages/ArchitectureDocs"));


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrganizationProvider>
        <ThemeProvider>
          <TooltipProvider>
            <OnlineIndicator />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <RouteErrorBoundary>
                <Suspense fallback={<LoadingScreen />}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route
                      element={
                        <ProtectedRoute>
                          <AppLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/" element={guard("Dashboard", <Dashboard />)} />
                      <Route path="/mockup" element={<Navigate to="/mockup/new" replace />} />
                      <Route path="/mockup/new" element={guard("Mockup", <MockupNew />)} />
                      <Route path="/mockup/drafts" element={guard("Mockup", <MockupDrafts />)} />
                      <Route path="/mockup/history" element={guard("Mockup", <MockupHistory />)} />
                      <Route path="/mockup/editor" element={guard("Editor de Mockup", <MockupEditor />)} />
                      <Route path="/mockup/service-order" element={guard("Ordem de Serviço", <ServiceOrder />)} />
                      <Route path="/mockup/service-orders" element={guard("Ordens de Serviço", <ServiceOrderList />)} />
                      <Route path="/mockup/service-dashboard" element={guard("Dashboard OS", <ServiceOrderDashboard />)} />
                      <Route path="/catalog" element={guard("Catálogo", <CatalogPage />)} />
                      <Route path="/magicup" element={<Navigate to="/magicup/generate" replace />} />
                      <Route path="/magicup/generate" element={guard("Magic Up", <MagicUpGenerate />)} />
                      <Route path="/magicup/prompts" element={guard("Magic Up", <MagicUpPrompts />)} />
                      <Route path="/magicup/history" element={guard("Magic Up", <MagicUpHistory />)} />
                      <Route path="/video" element={<Navigate to="/video/new" replace />} />
                      <Route path="/video/new" element={guard("Video Studio", <VideoNew />)} />
                      <Route path="/video/moodboard" element={guard("Video Moodboard", <VideoMoodboard />)} />
                      <Route path="/video/photodump" element={guard("Video Photodump", <VideoPhotodump />)} />
                      <Route path="/video/gallery" element={guard("Galeria de Vídeo", <VideoGallery />)} />
                      <Route path="/video/cinema" element={guard("Video Cinema", <VideoCinema />)} />
                      <Route path="/video/characters" element={guard("Character Studio", <CharacterStudio />)} />
                      <Route path="/video/history" element={guard("Histórico de Vídeo", <VideoHistory />)} />
                      <Route path="/settings" element={guard("Configurações", <Settings />)} />
                      <Route path="/templates" element={guard("Templates", <Templates />)} />
                      <Route path="/editor" element={<Navigate to="/mockup/editor" replace />} />
                      <Route path="/organization" element={guard("Organização", <OrganizationPage />)} />
                      <Route path="/clients" element={guard("Clientes", <ClientsPage />)} />
                      <Route path="/clients/:clientId/brand" element={guard("Brand Guidelines", <BrandGuidelinesPage />)} />
                      <Route path="/dam" element={guard("DAM", <DamLibraryPage />)} />
                      <Route path="/dam/preview" element={guard("DAM Preview", <DamPreviewPage />)} />
                      <Route path="/audit" element={guard("Auditoria", <AuditLogPage />)} />
                      <Route path="/audit/event/:eventId" element={guard("Auditoria", <AuditEventDetailPage />)} />
                      <Route path="/docs" element={guard("Documentação", <ArchitectureDocs />)} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </RouteErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </OrganizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
