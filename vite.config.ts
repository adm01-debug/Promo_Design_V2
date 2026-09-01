import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Proxy para Edge Functions do Supabase - bypass CORS para dev local
      // Cliente JS chama: /functions/v1/admin-maintenance
      // Proxies para: https://fygxlswpkjtjpcefjfty.supabase.co/functions/v1/admin-maintenance
      "/functions/v1/": {
        target: "https://fygxlswpkjtjpcefjfty.supabase.co",
        changeOrigin: true,
        secure: true,
      },
      // Proxy alternativo para endpoints admin
      "/admin-api": {
        target: "https://fygxlswpkjtjpcefjfty.supabase.co/functions/v1",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/admin-api/, ""),
      },
      // Fallback para outras portas comuns de dev
      "**/functions/**": {
        target: "https://fygxlswpkjtjpcefjfty.supabase.co",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
