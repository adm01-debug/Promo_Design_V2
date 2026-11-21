/**
 * Composição das cenas do Product Photodump.
 *
 * Cada cenário tem uma paleta determinística (fundo, piso, brilho, sombra e
 * decoração) e o produto é composto sobre ela com sombra de contato e vinheta.
 * O resultado é um PNG distinto por cenário — a página antes devolvia a mesma
 * imagem do produto para todos os cenários.
 */

export interface ScenePalette {
  id: string;
  /** Cor do fundo no topo e na base. */
  backdrop: [string, string];
  /** Cor do piso (mesa/superfície). `null` mantém o fundo até o fim. */
  floor: [string, string] | null;
  /** Altura relativa do horizonte (0 no topo, 1 na base). */
  horizon: number;
  /** Cor do brilho atrás do produto. */
  glow: string;
  /** Cor da sombra de contato. */
  shadow: string;
  /** Intensidade da vinheta (0 = nenhuma). */
  vignette: number;
  decor: "none" | "bokeh" | "beams" | "streaks" | "foliage" | "grid";
}

export const SCENE_PALETTES: Record<string, ScenePalette> = {
  "studio-white": {
    id: "studio-white",
    backdrop: ["#ffffff", "#e6e6e6"],
    floor: ["#f7f7f7", "#dcdcdc"],
    horizon: 0.72,
    glow: "rgba(0,0,0,0.10)",
    shadow: "rgba(0,0,0,0.20)",
    vignette: 0.06,
    decor: "none",
  },
  "studio-dark": {
    id: "studio-dark",
    backdrop: ["#1a1a1a", "#050505"],
    floor: ["#141414", "#000000"],
    horizon: 0.74,
    glow: "rgba(255,255,255,0.16)",
    shadow: "rgba(0,0,0,0.75)",
    vignette: 0.35,
    decor: "beams",
  },
  "lifestyle-desk": {
    id: "lifestyle-desk",
    backdrop: ["#e8e2d8", "#cfc6b6"],
    floor: ["#b98d5f", "#8a6440"],
    horizon: 0.6,
    glow: "rgba(255,236,200,0.55)",
    shadow: "rgba(60,40,20,0.35)",
    vignette: 0.14,
    decor: "bokeh",
  },
  "outdoor-nature": {
    id: "outdoor-nature",
    backdrop: ["#bfe3ff", "#6aa84f"],
    floor: ["#5d8c3a", "#37611f"],
    horizon: 0.62,
    glow: "rgba(255,255,220,0.45)",
    shadow: "rgba(20,50,10,0.35)",
    vignette: 0.12,
    decor: "foliage",
  },
  "urban-street": {
    id: "urban-street",
    backdrop: ["#9aa4ad", "#4d565f"],
    floor: ["#6e747a", "#3a3f44"],
    horizon: 0.55,
    glow: "rgba(255,255,255,0.25)",
    shadow: "rgba(0,0,0,0.5)",
    vignette: 0.22,
    decor: "grid",
  },
  cafe: {
    id: "cafe",
    backdrop: ["#f0dcc0", "#b98b5e"],
    floor: ["#a97544", "#6b431f"],
    horizon: 0.58,
    glow: "rgba(255,214,150,0.6)",
    shadow: "rgba(60,35,10,0.4)",
    vignette: 0.18,
    decor: "bokeh",
  },
  beach: {
    id: "beach",
    backdrop: ["#a7d8f5", "#f6e2b3"],
    floor: ["#e8cf95", "#c9a865"],
    horizon: 0.5,
    glow: "rgba(255,255,255,0.5)",
    shadow: "rgba(120,90,40,0.32)",
    vignette: 0.1,
    decor: "beams",
  },
  neon: {
    id: "neon",
    backdrop: ["#12002e", "#2b0245"],
    floor: ["#150a2e", "#05000d"],
    horizon: 0.66,
    glow: "rgba(233,0,255,0.5)",
    shadow: "rgba(0,0,0,0.7)",
    vignette: 0.4,
    decor: "streaks",
  },
  marble: {
    id: "marble",
    backdrop: ["#fbfbfb", "#e4e2df"],
    floor: ["#f2f0ec", "#d6d2cc"],
    horizon: 0.68,
    glow: "rgba(255,255,255,0.6)",
    shadow: "rgba(90,85,80,0.22)",
    vignette: 0.08,
    decor: "grid",
  },
  wood: {
    id: "wood",
    backdrop: ["#e7d3ba", "#c2a17c"],
    floor: ["#a9713f", "#6f4522"],
    horizon: 0.64,
    glow: "rgba(255,226,180,0.4)",
    shadow: "rgba(50,28,8,0.4)",
    vignette: 0.16,
    decor: "grid",
  },
  gradient: {
    id: "gradient",
    backdrop: ["#7f5af0", "#2cb67d"],
    floor: null,
    horizon: 1,
    glow: "rgba(255,255,255,0.35)",
    shadow: "rgba(0,0,0,0.28)",
    vignette: 0.12,
    decor: "bokeh",
  },
  christmas: {
    id: "christmas",
    backdrop: ["#0f3b23", "#06210f"],
    floor: ["#0b2a17", "#03120a"],
    horizon: 0.7,
    glow: "rgba(255,214,102,0.45)",
    shadow: "rgba(0,0,0,0.7)",
    vignette: 0.3,
    decor: "bokeh",
  },
  "desert-dusk": {
    id: "desert-dusk",
    backdrop: ["#ffb27a", "#8a4a3a"],
    floor: ["#e0a05e", "#a86b3c"],
    horizon: 0.55,
    glow: "rgba(255,210,150,0.55)",
    shadow: "rgba(90,40,20,0.35)",
    vignette: 0.18,
    decor: "beams",
  },
  "rain-city": {
    id: "rain-city",
    backdrop: ["#26303c", "#0e141b"],
    floor: ["#1b232c", "#070b0f"],
    horizon: 0.6,
    glow: "rgba(120,190,255,0.35)",
    shadow: "rgba(0,0,0,0.7)",
    vignette: 0.32,
    decor: "streaks",
  },
  museum: {
    id: "museum",
    backdrop: ["#f4f2ee", "#dcd8d1"],
    floor: ["#eeebe5", "#cdc7bd"],
    horizon: 0.66,
    glow: "rgba(255,250,235,0.55)",
    shadow: "rgba(80,75,65,0.2)",
    vignette: 0.09,
    decor: "beams",
  },
  gym: {
    id: "gym",
    backdrop: ["#2a2f36", "#11151a"],
    floor: ["#1c2127", "#080b0e"],
    horizon: 0.64,
    glow: "rgba(255,70,70,0.35)",
    shadow: "rgba(0,0,0,0.7)",
    vignette: 0.3,
    decor: "grid",
  },
  airport: {
    id: "airport",
    backdrop: ["#d7e6f3", "#8fa9c2"],
    floor: ["#c3d1de", "#8d9dac"],
    horizon: 0.6,
    glow: "rgba(255,255,255,0.5)",
    shadow: "rgba(40,55,75,0.3)",
    vignette: 0.12,
    decor: "streaks",
  },
  subway: {
    id: "subway",
    backdrop: ["#3b4046", "#171a1d"],
    floor: ["#4a5057", "#22262a"],
    horizon: 0.58,
    glow: "rgba(255,235,170,0.35)",
    shadow: "rgba(0,0,0,0.65)",
    vignette: 0.34,
    decor: "grid",
  },
  rooftop: {
    id: "rooftop",
    backdrop: ["#f2a06a", "#3c2f4d"],
    floor: ["#5a5566", "#2c2836"],
    horizon: 0.54,
    glow: "rgba(255,190,130,0.45)",
    shadow: "rgba(0,0,0,0.5)",
    vignette: 0.2,
    decor: "grid",
  },
  "garden-party": {
    id: "garden-party",
    backdrop: ["#cdecc0", "#7bbf6a"],
    floor: ["#8dc46f", "#4f8a3a"],
    horizon: 0.6,
    glow: "rgba(255,250,190,0.55)",
    shadow: "rgba(30,70,25,0.35)",
    vignette: 0.14,
    decor: "foliage",
  },
};

const FALLBACK_DECOR: ScenePalette["decor"][] = ["bokeh", "beams", "streaks", "grid"];

/** FNV-1a de 32 bits — semente estável por cenário. */
export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** PRNG determinístico (mulberry32) para decoração reprodutível. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getScenePalette(sceneId: string): ScenePalette {
  const palette = SCENE_PALETTES[sceneId];
  if (palette) return palette;
  const seed = hashSeed(sceneId);
  return {
    id: sceneId,
    backdrop: ["#e9e9ec", "#b9bcc4"],
    floor: ["#cfd2d8", "#93979f"],
    horizon: 0.62,
    glow: "rgba(255,255,255,0.4)",
    shadow: "rgba(0,0,0,0.35)",
    vignette: 0.15,
    decor: FALLBACK_DECOR[seed % FALLBACK_DECOR.length],
  };
}

export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Centro vertical do produto — onde a sombra de contato é ancorada. */
  baseline: number;
}

/**
 * Centraliza o produto respeitando margem e área máxima, com a base apoiada
 * acima do piso (para a sombra de contato ficar visível).
 */
export function computeProductPlacement(
  imageWidth: number,
  imageHeight: number,
  canvasSize: number,
  maxWidthRatio = 0.62,
  maxHeightRatio = 0.62,
  bottomRatio = 0.86,
): Placement {
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error("Dimensões da imagem do produto inválidas");
  }
  const scale = Math.min(
    (canvasSize * maxWidthRatio) / imageWidth,
    (canvasSize * maxHeightRatio) / imageHeight,
    1,
  );
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const baseline = canvasSize * bottomRatio;
  return {
    x: (canvasSize - width) / 2,
    y: baseline - height,
    width,
    height,
    baseline,
  };
}

function drawBackdrop(ctx: CanvasRenderingContext2D, palette: ScenePalette, size: number) {
  const backdrop = ctx.createLinearGradient(0, 0, 0, size * palette.horizon);
  backdrop.addColorStop(0, palette.backdrop[0]);
  backdrop.addColorStop(1, palette.backdrop[1]);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, size, size);

  if (!palette.floor) return;
  const floorTop = size * palette.horizon;
  const floor = ctx.createLinearGradient(0, floorTop, 0, size);
  floor.addColorStop(0, palette.floor[0]);
  floor.addColorStop(1, palette.floor[1]);
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorTop, size, size - floorTop);
}

function drawDecor(
  ctx: CanvasRenderingContext2D,
  palette: ScenePalette,
  size: number,
  random: () => number,
) {
  switch (palette.decor) {
    case "bokeh": {
      for (let i = 0; i < 18; i += 1) {
        const r = size * (0.02 + random() * 0.05);
        const x = random() * size;
        const y = random() * size * palette.horizon;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, palette.glow);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "beams": {
      for (let i = 0; i < 5; i += 1) {
        const x = size * (0.1 + i * 0.2);
        const grad = ctx.createLinearGradient(x, 0, x + size * 0.12, size * palette.horizon);
        grad.addColorStop(0, palette.glow);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + size * 0.12, 0);
        ctx.lineTo(x + size * 0.24, size * palette.horizon);
        ctx.lineTo(x + size * 0.12, size * palette.horizon);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "streaks": {
      ctx.strokeStyle = palette.glow;
      for (let i = 0; i < 22; i += 1) {
        const x = random() * size;
        const y = random() * size * palette.horizon;
        const len = size * (0.05 + random() * 0.18);
        ctx.lineWidth = 1 + random() * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + len);
        ctx.stroke();
      }
      break;
    }
    case "foliage": {
      for (let i = 0; i < 16; i += 1) {
        const x = random() * size;
        const y = random() * size * palette.horizon;
        const r = size * (0.05 + random() * 0.09);
        ctx.fillStyle = palette.glow;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.55, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "grid": {
      ctx.strokeStyle = palette.glow;
      ctx.lineWidth = 1;
      const step = size / 12;
      for (let i = 1; i < 12; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * step, size * palette.horizon);
        ctx.lineTo(i * step, size);
        ctx.stroke();
      }
      for (let i = 1; i < 5; i += 1) {
        const y = size * palette.horizon + (size - size * palette.horizon) * (i / 5) ** 1.6;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }
}

function drawShadow(
  ctx: CanvasRenderingContext2D,
  palette: ScenePalette,
  placement: Placement,
  size: number,
) {
  const radiusX = placement.width * 0.52;
  const radiusY = size * 0.035;
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(radiusX, radiusY));
  grad.addColorStop(0, palette.shadow);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.translate(size / 2, placement.baseline);
  ctx.scale(1, radiusY / Math.max(radiusX, radiusY));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(radiusX, radiusY), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, palette: ScenePalette, size: number) {
  if (palette.vignette <= 0) return;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.25,
    size / 2,
    size / 2,
    size * 0.75,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${palette.vignette})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
}

export interface RenderSceneOptions {
  sceneId: string;
  productImage: CanvasImageSource & { width: number; height: number };
  size?: number;
}

/** Desenha a cena completa num contexto 2D já dimensionado. */
export function drawPhotodumpScene(
  ctx: CanvasRenderingContext2D,
  options: RenderSceneOptions,
): void {
  const size = options.size ?? 900;
  const palette = getScenePalette(options.sceneId);
  const random = createSeededRandom(hashSeed(options.sceneId));

  drawBackdrop(ctx, palette, size);
  drawDecor(ctx, palette, size, random);

  const placement = computeProductPlacement(
    options.productImage.width,
    options.productImage.height,
    size,
  );
  drawShadow(ctx, palette, placement, size);
  ctx.drawImage(options.productImage, placement.x, placement.y, placement.width, placement.height);

  drawVignette(ctx, palette, size);
}

/**
 * Gera o PNG (data URL) do produto composto no cenário pedido.
 * Retorna data URL para não vazar object URLs entre trocas de produto.
 */
export async function renderPhotodumpScene(
  sceneId: string,
  productUrl: string,
  size = 900,
): Promise<string> {
  const { loadImageWithFallback } = await import("@/features/mockup/lib/canvas-utils");
  const image = await loadImageWithFallback(productUrl);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível neste navegador");
  drawPhotodumpScene(ctx, { sceneId, productImage: image, size });
  return canvas.toDataURL("image/png");
}
