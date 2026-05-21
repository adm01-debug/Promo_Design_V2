import {
  Monitor,
  Smartphone,
  Square,
  RectangleHorizontal,
  Sparkles,
  Zap,
  Megaphone,
  Heart,
  PartyPopper,
} from "lucide-react";

export type AspectRatio = "9:16" | "1:1" | "16:9" | "4:5";
export type VideoStyle =
  | "premium"
  | "dinamico"
  | "minimalista"
  | "impactante"
  | "elegante"
  | "jovem";
export type CreationMode = "template" | "ai";

export const ASPECT_RATIOS: {
  value: AspectRatio;
  label: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  { value: "9:16", label: "Reels", icon: Smartphone, desc: "Stories & Reels" },
  { value: "4:5", label: "Feed", icon: RectangleHorizontal, desc: "Instagram Feed" },
  { value: "1:1", label: "Quadrado", icon: Square, desc: "Post Feed" },
  { value: "16:9", label: "Wide", icon: Monitor, desc: "YouTube & Web" },
];

export const VIDEO_STYLES: {
  value: VideoStyle;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { value: "premium", label: "Premium", icon: Sparkles, color: "text-primary" },
  { value: "dinamico", label: "Dinâmico", icon: Zap, color: "text-accent" },
  { value: "minimalista", label: "Minimalista", icon: Square, color: "text-muted-foreground" },
  { value: "impactante", label: "Impactante", icon: Megaphone, color: "text-destructive" },
  { value: "elegante", label: "Elegante", icon: Heart, color: "text-secondary" },
  { value: "jovem", label: "Jovem", icon: PartyPopper, color: "text-primary" },
];

export const TEMPLATES = [
  {
    id: "reveal",
    name: "Product Reveal",
    desc: "Zoom in com brilho",
    duration: "5s",
    style: "premium",
  },
  {
    id: "showcase",
    name: "Showcase 360°",
    desc: "Rotação suave do produto",
    duration: "10s",
    style: "elegante",
  },
  {
    id: "promo",
    name: "Flash Promo",
    desc: "Cortes rápidos com preço",
    duration: "5s",
    style: "dinamico",
  },
  {
    id: "lifestyle",
    name: "Lifestyle Scene",
    desc: "Parallax suave contextual",
    duration: "10s",
    style: "premium",
  },
  {
    id: "unboxing",
    name: "Unboxing Effect",
    desc: "Abertura de caixa animada",
    duration: "5s",
    style: "impactante",
  },
  {
    id: "minimal",
    name: "Clean Minimal",
    desc: "Fade elegante e limpo",
    duration: "5s",
    style: "minimalista",
  },
  {
    id: "social",
    name: "Social Burst",
    desc: "Emojis e efeitos sociais",
    duration: "5s",
    style: "jovem",
  },
  {
    id: "story",
    name: "Story Carousel",
    desc: "Slides animados verticais",
    duration: "10s",
    style: "dinamico",
  },
  {
    id: "zoompulse",
    name: "Zoom Pulse",
    desc: "Pulsação com zoom contínuo",
    duration: "5s",
    style: "impactante",
  },
  {
    id: "splitreveal",
    name: "Split Reveal",
    desc: "Divisão da tela e revelação",
    duration: "5s",
    style: "premium",
  },
  {
    id: "glitch",
    name: "Glitch Effect",
    desc: "Distorção digital estilizada",
    duration: "5s",
    style: "jovem",
  },
  {
    id: "floating",
    name: "Floating Particles",
    desc: "Partículas flutuantes",
    duration: "10s",
    style: "elegante",
  },
  {
    id: "cinematic",
    name: "Cinematic Bars",
    desc: "Barras cinema + zoom lento",
    duration: "10s",
    style: "premium",
  },
  {
    id: "neonglow",
    name: "Neon Glow",
    desc: "Contorno neon pulsante",
    duration: "5s",
    style: "jovem",
  },
  {
    id: "bouncedrop",
    name: "Bounce Drop",
    desc: "Queda com efeito mola",
    duration: "5s",
    style: "dinamico",
  },
  {
    id: "morphshapes",
    name: "Morph Shapes",
    desc: "Formas geométricas rotativas",
    duration: "10s",
    style: "elegante",
  },
  {
    id: "spotlight",
    name: "Spotlight",
    desc: "Foco de luz em movimento",
    duration: "10s",
    style: "premium",
  },
  {
    id: "typewriter",
    name: "Typewriter",
    desc: "Texto animado letra a letra",
    duration: "5s",
    style: "impactante",
  },
  {
    id: "colorsweep",
    name: "Color Sweep",
    desc: "Onda de cor passando",
    duration: "5s",
    style: "minimalista",
  },
  {
    id: "matrixrain",
    name: "Matrix Rain",
    desc: "Chuva de código digital",
    duration: "10s",
    style: "jovem",
  },
  {
    id: "ambassador",
    name: "Brand Ambassador",
    desc: "Embaixador apresentando o produto",
    duration: "10s",
    style: "premium",
  },
];

export const ASPECT_PREVIEW: Record<AspectRatio, string> = {
  "9:16": "aspect-[9/16] max-h-[480px]",
  "4:5": "aspect-[4/5] max-h-[480px]",
  "1:1": "aspect-square max-h-[400px]",
  "16:9": "aspect-video max-h-[340px]",
};
