import { Image, Sparkles, ClipboardList, BarChart3, Film, Video } from "lucide-react";

export const quickActions = [
  { title: "Novo Mockup", description: "Layout técnico de personalização", icon: Image, path: "/mockup/new", color: "text-primary", bg: "bg-primary/10" },
  { title: "Magic Up", description: "Imagem publicitária com IA", icon: Sparkles, path: "/magicup/generate", color: "text-secondary", bg: "bg-secondary/10" },
  { title: "Nova OS", description: "Ordem de serviço", icon: ClipboardList, path: "/mockup/service-order", color: "text-accent", bg: "bg-accent/10" },
  { title: "Dashboard OS", description: "Métricas de produção", icon: BarChart3, path: "/mockup/service-dashboard", color: "text-primary", bg: "bg-primary/10" },
  { title: "Cinema Mode", description: "Color grading cinematográfico", icon: Film, path: "/video/cinema", color: "text-secondary", bg: "bg-secondary/10" },
  { title: "Novo Vídeo", description: "Vídeo publicitário animado", icon: Video, path: "/video/new", color: "text-accent", bg: "bg-accent/10" },
];

export const columnClasses: Record<number, string> = {
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
};
