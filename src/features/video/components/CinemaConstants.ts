export type GradingPreset = {
  id: string;
  label: string;
  desc: string;
  colors: [string, string, string];
  filters: {
    temperature: number;
    contrast: number;
    saturation: number;
    brightness: number;
    vignette: number;
  };
};

export const GRADING_PRESETS: GradingPreset[] = [
  {
    id: "teal-orange",
    label: "Teal & Orange",
    desc: "Blockbuster look — sombras frias, tons quentes na pele",
    colors: ["#008080", "#FF8C42", "#2C3E50"],
    filters: { temperature: 65, contrast: 70, saturation: 55, brightness: 50, vignette: 40 },
  },
  {
    id: "moody-blue",
    label: "Moody Blue",
    desc: "Tons azulados, dramático e introspectivo",
    colors: ["#1B3A5C", "#4A7FB5", "#0D1B2A"],
    filters: { temperature: 30, contrast: 65, saturation: 40, brightness: 42, vignette: 55 },
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    desc: "Luz dourada do pôr do sol, quente e acolhedor",
    colors: ["#F4A261", "#E9C46A", "#264653"],
    filters: { temperature: 75, contrast: 55, saturation: 65, brightness: 58, vignette: 25 },
  },
  {
    id: "noir",
    label: "Film Noir",
    desc: "Alto contraste, preto e branco dramático",
    colors: ["#1A1A1A", "#808080", "#F5F5F5"],
    filters: { temperature: 50, contrast: 85, saturation: 0, brightness: 45, vignette: 70 },
  },
  {
    id: "vintage-film",
    label: "Vintage Film",
    desc: "Estética de filme analógico dos anos 70",
    colors: ["#C9ADA7", "#9A8C98", "#4A4E69"],
    filters: { temperature: 60, contrast: 50, saturation: 35, brightness: 52, vignette: 35 },
  },
  {
    id: "neon-nights",
    label: "Neon Nights",
    desc: "Cyberpunk — neons vibrantes em escuridão",
    colors: ["#FF006E", "#8338EC", "#0A0A1A"],
    filters: { temperature: 45, contrast: 75, saturation: 80, brightness: 38, vignette: 60 },
  },
  {
    id: "kodak-portra",
    label: "Kodak Portra 400",
    desc: "Tons de pele suaves, granulação fina",
    colors: ["#E8C8A0", "#D4A574", "#6B8E7B"],
    filters: { temperature: 62, contrast: 48, saturation: 45, brightness: 55, vignette: 20 },
  },
  {
    id: "fuji-velvia",
    label: "Fuji Velvia 50",
    desc: "Cores ultra-saturadas, contraste alto",
    colors: ["#2E86AB", "#A23B72", "#F18F01"],
    filters: { temperature: 52, contrast: 78, saturation: 85, brightness: 48, vignette: 30 },
  },
  {
    id: "kodak-ektar",
    label: "Kodak Ektar 100",
    desc: "Grão ultrafino, cores vívidas, azuis profundos",
    colors: ["#1B4965", "#BEE9E8", "#CAD2C5"],
    filters: { temperature: 48, contrast: 68, saturation: 72, brightness: 50, vignette: 15 },
  },
  {
    id: "cinestill-800t",
    label: "CineStill 800T",
    desc: "Halação vermelha nas luzes, estética noturna",
    colors: ["#FF4444", "#1A1A2E", "#E0C3FC"],
    filters: { temperature: 38, contrast: 72, saturation: 60, brightness: 40, vignette: 50 },
  },
];

export type LightingSetup = { id: string; label: string; emoji: string; desc: string };

export const LIGHTING_SETUPS: LightingSetup[] = [
  { id: "three-point", label: "Three-Point", emoji: "💡", desc: "Key, fill e backlight clássico" },
  { id: "rembrandt", label: "Rembrandt", emoji: "🎨", desc: "Triângulo de luz na bochecha" },
  { id: "silhouette", label: "Silhueta", emoji: "🌑", desc: "Backlight forte, sujeito escuro" },
  { id: "rim", label: "Rim Light", emoji: "✨", desc: "Contorno brilhante nas bordas" },
  { id: "natural", label: "Luz Natural", emoji: "☀️", desc: "Janela lateral, suave e difusa" },
  { id: "dramatic", label: "Dramática", emoji: "🔦", desc: "Alto contraste, sombras pesadas" },
];
