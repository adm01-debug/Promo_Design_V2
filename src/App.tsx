import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import OnlineIndicator from "@/components/OnlineIndicator";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

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
const ServiceOrderList = lazyWithRetry(
  () => import("./features/service-orders/pages/ServiceOrderList"),
);
const ServiceOrderDashboard = lazyWithRetry(
  () => import("./features/service-orders/pages/ServiceOrderDashboard"),
);
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Templates = lazyWithRetry(() => import("./pages/Templates"));
const Editor = lazyWithRetry(() => import("./pages/Editor"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const OrganizationPage = lazyWithRetry(
  () => import("./features/organization/pages/OrganizationPage"),
);
const ClientsPage = lazyWithRetry(() => import("./features/clients/pages/ClientsPage"));
const AuditLogPage = lazyWithRetry(() => import("./features/audit/pages/AuditLogPage"));
const AuditEventDetailPage = lazyWithRetry(
  () => import("./features/audit/pages/AuditEventDetailPage"),
);
const DamLibraryPage = lazyWithRetry(() => import("./features/dam/pages/DamLibraryPage"));
const DamPreviewPage = lazyWithRetry(() => import("./features/dam/pages/DamPreviewPage"));
const BrandGuidelinesPage = lazyWithRetry(() => import("./features/dam/pages/BrandGuidelinesPage"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
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
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/mockup" element={<Navigate to="/mockup/new" replace />} />
                  <Route path="/mockup/new" element={<MockupNew />} />
                  <Route path="/mockup/drafts" element={<MockupDrafts />} />
                  <Route path="/mockup/history" element={<MockupHistory />} />
                  <Route path="/mockup/editor" element={<MockupEditor />} />
                  <Route path="/mockup/service-order" element={<ServiceOrder />} />
                  <Route path="/mockup/service-orders" element={<ServiceOrderList />} />
                  <Route path="/mockup/service-dashboard" element={<ServiceOrderDashboard />} />
                  <Route path="/catalog" element={<CatalogPage />} />
                  <Route path="/magicup" element={<Navigate to="/magicup/generate" replace />} />
                  <Route path="/magicup/generate" element={<MagicUpGenerate />} />
                  <Route path="/magicup/prompts" element={<MagicUpPrompts />} />
                  <Route path="/magicup/history" element={<MagicUpHistory />} />
                  <Route path="/video" element={<Navigate to="/video/new" replace />} />
                  <Route path="/video/new" element={<VideoNew />} />
                  <Route path="/video/moodboard" element={<VideoMoodboard />} />
                  <Route path="/video/photodump" element={<VideoPhotodump />} />
                  <Route path="/video/gallery" element={<VideoGallery />} />
                  <Route path="/video/cinema" element={<VideoCinema />} />
                  <Route path="/video/characters" element={<CharacterStudio />} />
                  <Route path="/video/history" element={<VideoHistory />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/editor" element={<Editor />} />
                  <Route path="/organization" element={<OrganizationPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/clients/:clientId/brand" element={<BrandGuidelinesPage />} />
                  <Route path="/dam" element={<DamLibraryPage />} />
                  <Route path="/dam/preview" element={<DamPreviewPage />} />
                  <Route path="/audit" element={<AuditLogPage />} />
                  <Route path="/audit/event/:eventId" element={<AuditEventDetailPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </RouteErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
