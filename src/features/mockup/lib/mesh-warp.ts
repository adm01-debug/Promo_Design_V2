/**
 * Mesh Warp Deformation Engine
 * 
 * Applies real Canvas 2D transformations to warp images
 * onto cylindrical, spherical, curved and angled surfaces.
 * Uses vertical strip slicing with sine/cosine distortion.
 */

import type { SurfaceType } from "./canvas-utils";

export interface WarpConfig {
  /** Number of vertical strips (more = smoother, slower) */
  strips: number;
  /** Curvature intensity 0-1 */
  intensity: number;
  /** Horizontal squeeze factor for cylindrical wrap */
  squeeze: number;
  /** Vertical bulge for spherical surfaces */
  verticalBulge: number;
  /** Shading: darken edges to simulate 3D depth */
  edgeShading: boolean;
  /** Tint color for shading (CSS color) */
  shadingColor: string;
  /** Max shading opacity 0-1 */
  shadingOpacity: number;
}

const DEFAULT_CONFIGS: Record<SurfaceType, WarpConfig> = {
  flat: {
    strips: 1,
    intensity: 0,
    squeeze: 1,
    verticalBulge: 0,
    edgeShading: false,
    shadingColor: "#000000",
    shadingOpacity: 0,
  },
  curved: {
    strips: 32,
    intensity: 0.15,
    squeeze: 0.97,
    verticalBulge: 0.03,
    edgeShading: true,
    shadingColor: "#000000",
    shadingOpacity: 0.12,
  },
  cylindrical: {
    strips: 48,
    intensity: 0.35,
    squeeze: 0.88,
    verticalBulge: 0,
    edgeShading: true,
    shadingColor: "#000000",
    shadingOpacity: 0.25,
  },
  spherical: {
    strips: 48,
    intensity: 0.3,
    squeeze: 0.85,
    verticalBulge: 0.2,
    edgeShading: true,
    shadingColor: "#000000",
    shadingOpacity: 0.3,
  },
  angled: {
    strips: 24,
    intensity: 0.2,
    squeeze: 0.95,
    verticalBulge: 0,
    edgeShading: true,
    shadingColor: "#000000",
    shadingOpacity: 0.15,
  },
};

/** Get the warp config for a surface type */
export function getWarpConfig(surface: SurfaceType): WarpConfig {
  return { ...DEFAULT_CONFIGS[surface] };
}

/**
 * Apply cylindrical/spherical warp deformation to an image.
 * Returns a new canvas with the warped result.
 */
export function applyMeshWarp(
  source: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
  surface: SurfaceType,
  customConfig?: Partial<WarpConfig>
): HTMLCanvasElement {
  const config = { ...DEFAULT_CONFIGS[surface], ...customConfig };
  
  // For flat surfaces, just draw normally
  if (surface === "flat" || config.intensity === 0) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source, 0, 0, width, height);
    return canvas;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const strips = config.strips;
  const stripW = width / strips;
  const srcW = ("naturalWidth" in source ? source.naturalWidth : source.width) || width;
  const srcH = ("naturalHeight" in source ? source.naturalHeight : source.height) || height;
  const srcStripW = srcW / strips;

  for (let i = 0; i < strips; i++) {
    // Normalized position: -1 to 1 across the image
    const t = (i / (strips - 1)) * 2 - 1;
    
    // Cylindrical curve: sine-based displacement
    const curve = Math.sin((t * Math.PI) / 2);
    const curveFull = Math.cos((t * Math.PI) / 2);
    
    // Vertical offset (creates the curved illusion)
    let yOffset = 0;
    let yScale = 1;

    if (surface === "cylindrical") {
      // Cylindrical: vertical compression at edges, slight Y shift
      yScale = 1 - config.intensity * (1 - curveFull) * 0.3;
      yOffset = config.intensity * curve * height * 0.05;
    } else if (surface === "spherical") {
      // Spherical: both X squeeze and Y bulge
      const dist = Math.abs(t);
      yScale = 1 - config.verticalBulge * dist * dist;
      yOffset = config.intensity * curve * height * 0.08;
      // Additional vertical curve
      const vCurve = Math.sqrt(1 - dist * dist * config.intensity);
      yScale *= vCurve;
      yOffset += (1 - vCurve) * height * 0.5;
    } else if (surface === "curved") {
      // Gentle curve
      yOffset = config.intensity * curve * height * 0.03;
      yScale = 1 - config.intensity * Math.abs(t) * 0.05;
    } else if (surface === "angled") {
      // Perspective-like: one side compressed
      const skew = t * config.intensity * 0.5;
      yScale = 1 - skew * 0.15;
      yOffset = skew * height * 0.08;
    }

    // Horizontal squeeze: edges are compressed
    const xSqueeze = config.squeeze + (1 - config.squeeze) * curveFull;
    const destStripW = stripW * xSqueeze;
    
    // Calculate destination X (accumulate squeeze effect)
    const centerX = width / 2;
    const normalDestX = i * stripW;
    const destX = centerX + (normalDestX - centerX) * config.squeeze + 
                  (1 - config.squeeze) * curve * width * 0.02;

    const destY = yOffset;
    const destH = height * yScale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(destX, 0, destStripW + 1, height);
    ctx.clip();
    
    ctx.drawImage(
      source,
      i * srcStripW, 0, srcStripW + 1, srcH,
      destX, destY, destStripW + 1, destH
    );
    ctx.restore();
  }

  // Apply edge shading for 3D depth effect
  if (config.edgeShading && config.shadingOpacity > 0) {
    applyEdgeShading(ctx, width, height, config, surface);
  }

  return canvas;
}

/** Apply gradient shading on edges to simulate 3D lighting */
function applyEdgeShading(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: WarpConfig,
  surface: SurfaceType
) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";

  if (surface === "cylindrical" || surface === "curved") {
    // Left-to-right gradient: dark → light → dark
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    const opacity = config.shadingOpacity;
    const darkColor = `rgba(0,0,0,${opacity})`;
    const midColor = `rgba(128,128,128,${opacity * 0.1})`;
    grad.addColorStop(0, darkColor);
    grad.addColorStop(0.15, midColor);
    grad.addColorStop(0.4, "rgba(255,255,255,0)");
    grad.addColorStop(0.6, "rgba(255,255,255,0)");
    grad.addColorStop(0.85, midColor);
    grad.addColorStop(1, darkColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Highlight stripe for specular reflection
    ctx.globalCompositeOperation = "screen";
    const highlight = ctx.createLinearGradient(0, 0, width, 0);
    highlight.addColorStop(0, "rgba(255,255,255,0)");
    highlight.addColorStop(0.35, "rgba(255,255,255,0)");
    highlight.addColorStop(0.45, `rgba(255,255,255,${opacity * 0.3})`);
    highlight.addColorStop(0.55, `rgba(255,255,255,${opacity * 0.3})`);
    highlight.addColorStop(0.65, "rgba(255,255,255,0)");
    highlight.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = highlight;
    ctx.fillRect(0, 0, width, height);
  } else if (surface === "spherical") {
    // Radial gradient: light center, dark edges
    const cx = width / 2;
    const cy = height / 2;
    const rad = Math.max(width, height) * 0.5;
    const grad = ctx.createRadialGradient(cx * 0.9, cy * 0.85, rad * 0.1, cx, cy, rad);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.6, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${config.shadingOpacity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Specular highlight
    ctx.globalCompositeOperation = "screen";
    const hl = ctx.createRadialGradient(cx * 0.7, cy * 0.6, 0, cx * 0.7, cy * 0.6, rad * 0.4);
    hl.addColorStop(0, `rgba(255,255,255,${config.shadingOpacity * 0.5})`);
    hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl;
    ctx.fillRect(0, 0, width, height);
  } else if (surface === "angled") {
    // Left gradient: darkens one side
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, `rgba(0,0,0,${config.shadingOpacity})`);
    grad.addColorStop(0.4, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

/**
 * Generate a warped preview as a data URL for use in <img> tags.
 * Caches the result to avoid re-rendering on every frame.
 */
const warpCache = new Map<string, string>();

export function getWarpedPreview(
  logoSrc: string,
  width: number,
  height: number,
  surface: SurfaceType,
  rotation: number = 0,
  flipH: boolean = false,
  flipV: boolean = false
): Promise<string> {
  const cacheKey = `${logoSrc}_${width}_${height}_${surface}_${rotation}_${flipH}_${flipV}`;
  const cached = warpCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // First apply rotation/flip to a temp canvas
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d")!;
      
      tempCtx.save();
      tempCtx.translate(width / 2, height / 2);
      tempCtx.rotate((rotation * Math.PI) / 180);
      tempCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      tempCtx.drawImage(img, -width / 2, -height / 2, width, height);
      tempCtx.restore();

      // Then apply warp
      const warped = applyMeshWarp(tempCanvas, width, height, surface);
      const dataUrl = warped.toDataURL("image/png");
      
      // Keep cache bounded
      if (warpCache.size > 50) {
        const firstKey = warpCache.keys().next().value;
        if (firstKey) warpCache.delete(firstKey);
      }
      warpCache.set(cacheKey, dataUrl);
      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error("Failed to load logo for warp"));
    img.src = logoSrc;
  });
}

/** Clear the warp cache (call when logo changes) */
export function clearWarpCache() {
  warpCache.clear();
}
