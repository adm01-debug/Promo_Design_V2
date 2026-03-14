import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import MockupNew from "./pages/MockupNew";
import MockupDrafts from "./pages/MockupDrafts";
import MockupHistory from "./pages/MockupHistory";
import MagicUpGenerate from "./pages/MagicUpGenerate";
import MagicUpPrompts from "./pages/MagicUpPrompts";
import MagicUpHistory from "./pages/MagicUpHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mockup" element={<Navigate to="/mockup/new" replace />} />
            <Route path="/mockup/new" element={<MockupNew />} />
            <Route path="/mockup/drafts" element={<MockupDrafts />} />
            <Route path="/mockup/history" element={<MockupHistory />} />
            <Route path="/magicup" element={<Navigate to="/magicup/generate" replace />} />
            <Route path="/magicup/generate" element={<MagicUpGenerate />} />
            <Route path="/magicup/prompts" element={<MagicUpPrompts />} />
            <Route path="/magicup/history" element={<MagicUpHistory />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
