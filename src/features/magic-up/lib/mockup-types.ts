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
  metadata?: Record<string, unknown>;
}

// Sample products for demo
export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "caneca-001",
    name: "Caneca Cerâmica 325ml",
    imageUrl: productCaneca,
    category: "Cerâmica",
    areas: [
      {
        id: "a1",
        name: "Frente",
        x: 100,
        y: 120,
        width: 200,
        height: 160,
        widthCm: 8,
        heightCm: 6,
        techniques: ["laser", "serigrafia", "uv"],
      },
    ],
  },
  {
    id: "camiseta-001",
    name: "Camiseta Algodão P/M/G",
    imageUrl: productCamiseta,
    category: "Vestuário",
    areas: [
      {
        id: "a1",
        name: "Peito Esquerdo",
        x: 160,
        y: 140,
        width: 100,
        height: 100,
        widthCm: 8,
        heightCm: 8,
        techniques: ["serigrafia", "uv"],
      },
      {
        id: "a2",
        name: "Costas Central",
        x: 150,
        y: 120,
        width: 200,
        height: 220,
        widthCm: 25,
        heightCm: 30,
        techniques: ["serigrafia", "uv"],
      },
    ],
  },
  {
    id: "squeeze-001",
    name: "Squeeze Inox 500ml",
    imageUrl: productSqueeze,
    category: "Drinkware",
    areas: [
      {
        id: "a1",
        name: "Corpo Frontal",
        x: 170,
        y: 100,
        width: 120,
        height: 220,
        widthCm: 6,
        heightCm: 10,
        techniques: ["laser", "serigrafia"],
      },
    ],
  },
  {
    id: "caderno-001",
    name: "Caderno Capa Dura A5",
    imageUrl: productCaderno,
    category: "Papelaria",
    areas: [
      {
        id: "a1",
        name: "Capa Frontal",
        x: 80,
        y: 60,
        width: 280,
        height: 350,
        widthCm: 14,
        heightCm: 20,
        techniques: ["laser", "serigrafia", "uv"],
      },
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
  "Mockup Cenário",
] as const;

export const SAMPLE_PROMPTS: PromptTemplate[] = [
  {
    id: "p1",
    category: "Corporativo",
    title: "Mockup Premium em Mesa Executiva",
    prompt:
      "Professional product mockup on a dark executive desk with warm ambient lighting, premium feel, shallow depth of field, {product} with {technique} customization showing {logo}",
    tags: ["premium", "corporativo", "mesa"],
  },
  {
    id: "p2",
    category: "E-commerce",
    title: "Flat Lay Minimalista",
    prompt:
      "Clean flat lay product photography on white marble surface, {product} centered with minimal props, soft natural light from above, e-commerce ready",
    tags: ["ecommerce", "flatlay", "minimalista"],
  },
  {
    id: "p3",
    category: "Redes Sociais",
    title: "Lifestyle Moderno",
    prompt:
      "Modern lifestyle scene with {product} in daily use, natural environment, authentic feel, Instagram-worthy composition, bokeh background",
    tags: ["social", "lifestyle", "instagram"],
  },
  {
    id: "p4",
    category: "Brindes",
    title: "Kit Corporativo Completo",
    prompt:
      "Corporate gift set arrangement with multiple branded items, elegant presentation box, {product} featured prominently, professional studio lighting",
    tags: ["brindes", "kit", "corporativo"],
  },
  // ── Recraft-inspired prompts ──
  {
    id: "p5",
    category: "Drinkware",
    title: "Caneca Cerâmica Minimalista",
    prompt:
      "A plain ceramic mug centered in the frame on a smooth neutral surface. The background is solid and minimal. Soft, diffused lighting highlights the mug's shape without reflections. Clean and modern mockup style. {product}",
    tags: ["caneca", "minimalista", "studio"],
  },
  {
    id: "p6",
    category: "Vestuário",
    title: "Camiseta Dobrada em Estúdio",
    prompt:
      "A folded blank t-shirt placed neatly at the center of a matte studio surface. The background is monochrome and minimal. Soft shadows add depth without breaking the flat mockup aesthetic. {product}",
    tags: ["camiseta", "flatlay", "studio"],
  },
  {
    id: "p7",
    category: "Vestuário",
    title: "Hoodie Pendurado Minimal",
    prompt:
      "A minimal studio shot of a hoodie hanging on a simple rail above a neutral background, front-facing and centered. Very soft shadow beneath the garment. Clean, modern, and minimal mockup aesthetic. {product}",
    tags: ["hoodie", "minimalista", "pendurado"],
  },
  {
    id: "p8",
    category: "Banner/Outdoor",
    title: "Billboard Praia Tropical",
    prompt:
      "Empty white billboard mockup front view without perspective, on tropical beach with palm trees at sunset with orange sky. High resolution, photorealistic.",
    tags: ["billboard", "praia", "outdoor"],
  },
  {
    id: "p9",
    category: "Banner/Outdoor",
    title: "Poster Metrô Urbano",
    prompt:
      "A blank poster mounted flat against a tiled underground subway wall, photographed straight-on without perspective. Slightly aged tiles with subtle texture. Soft fluorescent lighting. Urban, utilitarian feel.",
    tags: ["poster", "metro", "urbano"],
  },
  {
    id: "p10",
    category: "Banner/Outdoor",
    title: "Billboard Aeroporto Moderno",
    prompt:
      "A large digital billboard inside a modern airport terminal, front-facing with strong symmetry. Glass, steel, polished floors reflecting light. Blurred travelers in background. Bright, neutral, controlled lighting.",
    tags: ["billboard", "aeroporto", "moderno"],
  },
  {
    id: "p11",
    category: "Embalagem",
    title: "Cosmético Artesanal",
    prompt:
      "A soft upright tube of cream displayed prominently on a rugged organic surface. Beside it a sliced fig with rich interior exposed, suggesting natural ingredients. Warm lighting, editorial style. {product}",
    tags: ["cosmético", "natural", "editorial"],
  },
  {
    id: "p12",
    category: "Mockup Cenário",
    title: "Produto no Deserto Noturno",
    prompt:
      "A brightly lit display stands in the middle of a desert landscape at night, casting stark white glow. Tall cacti and desert shrubs surround the base. Dark mountain in background under twilight sky. Surreal, cinematic. {product}",
    tags: ["deserto", "noturno", "cinematic"],
  },
  {
    id: "p13",
    category: "E-commerce",
    title: "Produto Fundo Branco Puro",
    prompt:
      "E-commerce product photo of {product} on pure white background, centered, even lighting, high resolution, Amazon/Shopify ready, no shadows, clean edges",
    tags: ["ecommerce", "fundo branco", "catálogo"],
  },
  {
    id: "p14",
    category: "Mockup Cenário",
    title: "Mesa de Café Lifestyle",
    prompt:
      "Cozy coffee shop table scene with {product} next to a steaming latte, morning light streaming through window, warm tones, authentic lifestyle feel, shallow depth of field",
    tags: ["café", "lifestyle", "acolhedor"],
  },
  {
    id: "p15",
    category: "Corporativo",
    title: "Sala de Reunião Moderna",
    prompt:
      "Modern conference room table with {product} arranged professionally, glass walls showing city skyline, soft ambient lighting, corporate premium feel",
    tags: ["reunião", "escritório", "premium"],
  },
  {
    id: "p16",
    category: "Redes Sociais",
    title: "Cenário Vibrante para Stories",
    prompt:
      "Eye-catching vertical composition with {product} on colorful geometric background, bold shadows, trendy Gen-Z aesthetic, perfect for Instagram Stories and TikTok",
    tags: ["stories", "vibrante", "genz"],
  },
];

// ── Inspiration Gallery Data (Recraft-inspired) ──
export interface InspirationItem {
  id: string;
  prompt: string;
  category: string;
  thumbnail: string;
  tags: string[];
}

export const INSPIRATION_GALLERY: InspirationItem[] = [
  {
    id: "insp-1",
    prompt:
      "A plain black ceramic mug centered on smooth neutral surface, soft diffused lighting, clean modern mockup style",
    category: "Drinkware",
    thumbnail: "🖤",
    tags: ["caneca", "minimalista"],
  },
  {
    id: "insp-2",
    prompt:
      "Folded blank t-shirt on matte studio surface, monochrome minimal, soft shadows, flat mockup aesthetic",
    category: "Vestuário",
    thumbnail: "👕",
    tags: ["camiseta", "studio"],
  },
  {
    id: "insp-3",
    prompt:
      "Yellow hoodie hanging on simple rail, front-facing centered, soft shadow, clean modern minimal mockup",
    category: "Vestuário",
    thumbnail: "🧥",
    tags: ["hoodie", "pendurado"],
  },
  {
    id: "insp-4",
    prompt:
      "Empty white billboard front view on tropical beach with palm trees at sunset with orange sky",
    category: "Banner/Outdoor",
    thumbnail: "🏖️",
    tags: ["billboard", "praia"],
  },
  {
    id: "insp-5",
    prompt:
      "Product mockup eyeshadow palette, package design, luxury cosmetic photography, soft studio lighting",
    category: "Embalagem",
    thumbnail: "💄",
    tags: ["cosmético", "embalagem"],
  },
  {
    id: "insp-6",
    prompt:
      "Blank poster against tiled subway wall, straight-on, fluorescent lighting, urban utilitarian feel",
    category: "Banner/Outdoor",
    thumbnail: "🚇",
    tags: ["poster", "urbano"],
  },
  {
    id: "insp-7",
    prompt:
      "Digital billboard inside modern airport terminal, glass and steel architecture, blurred travelers, bright neutral lighting",
    category: "Banner/Outdoor",
    thumbnail: "✈️",
    tags: ["billboard", "aeroporto"],
  },
  {
    id: "insp-8",
    prompt:
      "Phone mockup centered on clean desk, minimal composition, tech product photography, soft shadows",
    category: "E-commerce",
    thumbnail: "📱",
    tags: ["tech", "celular"],
  },
  {
    id: "insp-9",
    prompt:
      "Cream tube on rugged organic surface with sliced fig, natural ingredients feel, warm editorial lighting",
    category: "Embalagem",
    thumbnail: "🧴",
    tags: ["cosmético", "natural"],
  },
  {
    id: "insp-10",
    prompt:
      "Brightly lit display in desert at night, cacti surrounding, dark mountain under twilight, surreal cinematic",
    category: "Mockup Cenário",
    thumbnail: "🏜️",
    tags: ["deserto", "cinematic"],
  },
  {
    id: "insp-11",
    prompt:
      "Deep dish plate in soft smoky gray on matte black base, luxury restaurant top-down photoshoot, monochrome",
    category: "Drinkware",
    thumbnail: "🍽️",
    tags: ["luxo", "restaurante"],
  },
  {
    id: "insp-12",
    prompt:
      "Corporate gift set with branded items in elegant presentation box, professional studio lighting, catalog quality",
    category: "Brindes",
    thumbnail: "🎁",
    tags: ["kit", "corporativo"],
  },
];
