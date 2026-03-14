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
import { lazyWithRetry } from "@/lib/lazy-with-retry";

const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const MockupNew = lazyWithRetry(() => import("./pages/MockupNew"));
const MockupDrafts = lazyWithRetry(() => import("./pages/MockupDrafts"));
const MockupHistory = lazyWithRetry(() => import("./pages/MockupHistory"));
const MockupEditor = lazyWithRetry(() => import("./pages/MockupEditor"));
const MagicUpGenerate = lazyWithRetry(() => import("./pages/MagicUpGenerate"));
const MagicUpPrompts = lazyWithRetry(() => import("./pages/MagicUpPrompts"));
const MagicUpHistory = lazyWithRetry(() => import("./pages/MagicUpHistory"));
const VideoNew = lazyWithRetry(() => import("./pages/VideoNew"));
const VideoHistory = lazyWithRetry(() => import("./pages/VideoHistory"));
const VideoMoodboard = lazyWithRetry(() => import("./pages/VideoMoodboard"));
const VideoPhotodump = lazyWithRetry(() => import("./pages/VideoPhotodump"));
const VideoGallery = lazyWithRetry(() => import("./pages/VideoGallery"));
const VideoCinema = lazyWithRetry(() => import("./pages/VideoCinema"));
const CharacterStudio = lazyWithRetry(() => import("./pages/CharacterStudio"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

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
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/mockup" element={<Navigate to="/mockup/new" replace />} />
                  <Route path="/mockup/new" element={<MockupNew />} />
                  <Route path="/mockup/drafts" element={<MockupDrafts />} />
                  <Route path="/mockup/history" element={<MockupHistory />} />
                  <Route path="/mockup/editor" element={<MockupEditor />} />
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
