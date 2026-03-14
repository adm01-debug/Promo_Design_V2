import productCaneca from "@/assets/product-caneca.png";
import productCamiseta from "@/assets/product-camiseta.png";
import productSqueeze from "@/assets/product-squeeze.png";
import productCaderno from "@/assets/product-caderno.png";

export type Technique = "laser" | "serigrafia" | "uv";

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  areas: CustomizationArea[];
}

export interface CustomizationArea {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  widthCm: number;
  heightCm: number;
  techniques: Technique[];
}

export interface LogoPlacement {
  areaId: string;
  logoDataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  technique: Technique;
  processedDataUrl?: string;
  colors: string[];
}

export interface MockupDraft {
  id: string;
  productId: string;
  product: Product;
  placements: LogoPlacement[];
  createdAt: string;
  updatedAt: string;
  name: string;
}

export interface GeneratedMockup {
  id: string;
  draftId?: string;
  productId: string;
  productName: string;
  technique: Technique;
  imageUrl: string;
  thumbnailUrl?: string;
  metadata: {
    dimensions: { width: number; height: number };
    colors: string[];
    area: string;
    dpi: number;
  };
  createdAt: string;
  clientName?: string;
}

// Magic Up types
export interface PromptTemplate {
  id: string;
  category: string;
  title: string;
  prompt: string;
  segment?: string;
  tags: string[];
}

export interface MagicUpGeneration {
  id: string;
  prompt: string;
  imageUrl: string;
  productId?: string;
  technique?: string;
  favorite: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

// Sample products for demo
export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "caneca-001",
    name: "Caneca Cerâmica 325ml",
    imageUrl: "/placeholder.svg",
    category: "Cerâmica",
    areas: [
      { id: "a1", name: "Frente", x: 120, y: 80, width: 200, height: 160, widthCm: 8, heightCm: 6, techniques: ["laser", "serigrafia", "uv"] },
    ],
  },
  {
    id: "camiseta-001",
    name: "Camiseta Algodão P/M/G",
    imageUrl: "/placeholder.svg",
    category: "Vestuário",
    areas: [
      { id: "a1", name: "Peito Esquerdo", x: 80, y: 100, width: 100, height: 100, widthCm: 8, heightCm: 8, techniques: ["serigrafia", "uv"] },
      { id: "a2", name: "Costas Central", x: 140, y: 80, width: 180, height: 200, widthCm: 25, heightCm: 30, techniques: ["serigrafia", "uv"] },
    ],
  },
  {
    id: "squeeze-001",
    name: "Squeeze Inox 500ml",
    imageUrl: "/placeholder.svg",
    category: "Drinkware",
    areas: [
      { id: "a1", name: "Corpo Frontal", x: 100, y: 60, width: 150, height: 200, widthCm: 6, heightCm: 10, techniques: ["laser", "serigrafia"] },
    ],
  },
  {
    id: "caderno-001",
    name: "Caderno Capa Dura A5",
    imageUrl: "/placeholder.svg",
    category: "Papelaria",
    areas: [
      { id: "a1", name: "Capa Frontal", x: 40, y: 40, width: 280, height: 380, widthCm: 14, heightCm: 20, techniques: ["laser", "serigrafia", "uv"] },
    ],
  },
];

export const PROMPT_CATEGORIES = [
  "Corporativo",
  "E-commerce",
  "Redes Sociais",
  "Embalagem",
  "Banner/Outdoor",
  "Convite/Evento",
  "Editorial",
  "Brindes",
  "Vestuário",
  "Drinkware",
  "Papelaria",
] as const;

export const SAMPLE_PROMPTS: PromptTemplate[] = [
  {
    id: "p1",
    category: "Corporativo",
    title: "Mockup Premium em Mesa Executiva",
    prompt: "Professional product mockup on a dark executive desk with warm ambient lighting, premium feel, shallow depth of field, {product} with {technique} customization showing {logo}",
    tags: ["premium", "corporativo", "mesa"],
  },
  {
    id: "p2",
    category: "E-commerce",
    title: "Flat Lay Minimalista",
    prompt: "Clean flat lay product photography on white marble surface, {product} centered with minimal props, soft natural light from above, e-commerce ready",
    tags: ["ecommerce", "flatlay", "minimalista"],
  },
  {
    id: "p3",
    category: "Redes Sociais",
    title: "Lifestyle Moderno",
    prompt: "Modern lifestyle scene with {product} in daily use, natural environment, authentic feel, Instagram-worthy composition, bokeh background",
    tags: ["social", "lifestyle", "instagram"],
  },
  {
    id: "p4",
    category: "Brindes",
    title: "Kit Corporativo Completo",
    prompt: "Corporate gift set arrangement with multiple branded items, elegant presentation box, {product} featured prominently, professional studio lighting",
    tags: ["brindes", "kit", "corporativo"],
  },
];
