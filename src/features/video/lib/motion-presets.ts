import {
  Aperture,
  ArrowDownToLine,
  ArrowUpFromLine,
  Camera,
  CircleDot,
  Clapperboard,
  CloudFog,
  Compass,
  Crosshair,
  Droplets,
  Flame,
  Focus,
  Gauge,
  Layers,
  MoveDiagonal,
  MoveHorizontal,
  Orbit,
  Rocket,
  Scan,
  Snowflake,
  Sun,
  Sunset,
  Timer,
  Wind,
  ZoomIn,
} from "lucide-react";

/** Grupos de presets — espelham a taxonomia de "motions" cinematográficos. */
export type MotionPresetGroup = "camera" | "ritmo" | "lente" | "ambiente";

export interface MotionPreset {
  /** Identificador estável usado em persistência e telemetria. */
  readonly id: string;
  /** Rótulo exibido ao usuário (PT-BR). */
  readonly label: string;
  /** Descrição curta do efeito (PT-BR). */
  readonly description: string;
  readonly group: MotionPresetGroup;
  readonly icon: React.ElementType;
  /**
   * Fragmento em inglês injetado no prompt final.
   * Modelos de vídeo têm aderência muito maior a termos cinematográficos
   * em inglês, por isso o texto do prompt não é traduzido.
   */
  readonly promptFragment: string;
}

export const MOTION_PRESET_GROUP_LABELS: Record<MotionPresetGroup, string> = {
  camera: "Câmera",
  ritmo: "Ritmo",
  lente: "Lente",
  ambiente: "Ambiente",
};

export const MOTION_PRESETS: readonly MotionPreset[] = [
  // ── Câmera ────────────────────────────────────────────────
  {
    id: "crash-zoom",
    label: "Crash Zoom",
    description: "Zoom violento e instantâneo no produto",
    group: "camera",
    icon: ZoomIn,
    promptFragment: "aggressive crash zoom pushing rapidly toward the subject",
  },
  {
    id: "dolly-in",
    label: "Dolly In",
    description: "Aproximação suave e contínua",
    group: "camera",
    icon: ArrowDownToLine,
    promptFragment: "smooth cinematic dolly-in slowly closing distance to the subject",
  },
  {
    id: "dolly-out",
    label: "Dolly Out",
    description: "Afastamento revelando o cenário",
    group: "camera",
    icon: ArrowUpFromLine,
    promptFragment: "steady dolly-out gradually revealing the surrounding environment",
  },
  {
    id: "orbit",
    label: "Órbita 360°",
    description: "Rotação completa ao redor do produto",
    group: "camera",
    icon: Orbit,
    promptFragment: "full 360 degree orbital camera move circling the subject",
  },
  {
    id: "arc-shot",
    label: "Arc Shot",
    description: "Arco lateral parcial",
    group: "camera",
    icon: Compass,
    promptFragment: "sweeping arc shot travelling laterally around the subject",
  },
  {
    id: "crane-up",
    label: "Crane Up",
    description: "Elevação de guindaste",
    group: "camera",
    icon: MoveDiagonal,
    promptFragment: "crane camera rising upward while keeping the subject framed",
  },
  {
    id: "fpv-drone",
    label: "FPV Drone",
    description: "Voo agressivo de drone FPV",
    group: "camera",
    icon: Rocket,
    promptFragment: "high speed FPV drone flight weaving through the scene",
  },
  {
    id: "whip-pan",
    label: "Whip Pan",
    description: "Giro rápido com motion blur",
    group: "camera",
    icon: MoveHorizontal,
    promptFragment: "fast whip pan transition with directional motion blur",
  },
  {
    id: "handheld",
    label: "Câmera na Mão",
    description: "Micro tremores documentais",
    group: "camera",
    icon: Camera,
    promptFragment: "organic handheld camera with subtle natural shake",
  },
  {
    id: "top-down",
    label: "Top Down",
    description: "Plano zenital descendo",
    group: "camera",
    icon: Scan,
    promptFragment: "top-down overhead shot descending onto the subject",
  },

  // ── Ritmo ─────────────────────────────────────────────────
  {
    id: "bullet-time",
    label: "Bullet Time",
    description: "Tempo congelado com câmera em movimento",
    group: "ritmo",
    icon: Crosshair,
    promptFragment: "bullet time effect, frozen action while the camera keeps moving",
  },
  {
    id: "slow-motion",
    label: "Slow Motion",
    description: "Alta taxa de quadros, movimento lento",
    group: "ritmo",
    icon: Timer,
    promptFragment: "high frame rate slow motion emphasising fine detail",
  },
  {
    id: "speed-ramp",
    label: "Speed Ramp",
    description: "Aceleração e desaceleração dramática",
    group: "ritmo",
    icon: Gauge,
    promptFragment: "dynamic speed ramp accelerating then easing into slow motion",
  },
  {
    id: "hyperlapse",
    label: "Hyperlapse",
    description: "Deslocamento acelerado no tempo",
    group: "ritmo",
    icon: Clapperboard,
    promptFragment: "hyperlapse with accelerated travelling motion through space",
  },
  {
    id: "freeze-reveal",
    label: "Freeze & Reveal",
    description: "Congela e revela o produto",
    group: "ritmo",
    icon: CircleDot,
    promptFragment: "sudden freeze frame followed by a clean reveal of the product",
  },

  // ── Lente ─────────────────────────────────────────────────
  {
    id: "macro",
    label: "Macro",
    description: "Detalhe extremo de textura",
    group: "lente",
    icon: Focus,
    promptFragment: "extreme macro lens capturing surface texture and material detail",
  },
  {
    id: "shallow-dof",
    label: "Foco Raso",
    description: "Fundo desfocado, bokeh cremoso",
    group: "lente",
    icon: Aperture,
    promptFragment: "shallow depth of field with creamy bokeh isolating the subject",
  },
  {
    id: "rack-focus",
    label: "Rack Focus",
    description: "Transferência de foco entre planos",
    group: "lente",
    icon: Layers,
    promptFragment: "rack focus shifting sharpness from foreground to the product",
  },
  {
    id: "anamorphic",
    label: "Anamórfica",
    description: "Flares horizontais e formato largo",
    group: "lente",
    icon: Sunset,
    promptFragment: "anamorphic lens look with horizontal flares and wide cinematic framing",
  },
  {
    id: "fisheye",
    label: "Fisheye",
    description: "Distorção grande-angular",
    group: "lente",
    icon: Scan,
    promptFragment: "ultra wide fisheye lens with pronounced barrel distortion",
  },

  // ── Ambiente ──────────────────────────────────────────────
  {
    id: "golden-hour",
    label: "Golden Hour",
    description: "Luz quente de fim de tarde",
    group: "ambiente",
    icon: Sun,
    promptFragment: "warm golden hour lighting with long soft shadows",
  },
  {
    id: "studio-softbox",
    label: "Estúdio Softbox",
    description: "Luz difusa de estúdio",
    group: "ambiente",
    icon: Sun,
    promptFragment: "clean studio lighting with large diffused softboxes and seamless backdrop",
  },
  {
    id: "neon-night",
    label: "Neon Noturno",
    description: "Cidade à noite com neon",
    group: "ambiente",
    icon: Flame,
    promptFragment: "night scene lit by colourful neon signage and wet reflective surfaces",
  },
  {
    id: "volumetric-fog",
    label: "Névoa Volumétrica",
    description: "Feixes de luz na neblina",
    group: "ambiente",
    icon: CloudFog,
    promptFragment: "volumetric fog with visible light beams cutting through the haze",
  },
  {
    id: "water-splash",
    label: "Respingos d'Água",
    description: "Água em suspensão ao redor",
    group: "ambiente",
    icon: Droplets,
    promptFragment: "dynamic water splashes and droplets suspended around the product",
  },
  {
    id: "frost",
    label: "Gelo & Vapor",
    description: "Vapor frio e cristais de gelo",
    group: "ambiente",
    icon: Snowflake,
    promptFragment: "cold vapour and frost crystals drifting across the surface",
  },
  {
    id: "wind-fabric",
    label: "Vento",
    description: "Tecidos e partículas ao vento",
    group: "ambiente",
    icon: Wind,
    promptFragment: "flowing fabric and light particles carried by wind",
  },
] as const;

const PRESETS_BY_ID = new Map(MOTION_PRESETS.map((p) => [p.id, p]));

/** Retorna o preset pelo id, ou `undefined` se o id for desconhecido. */
export function getMotionPreset(id: string): MotionPreset | undefined {
  return PRESETS_BY_ID.get(id);
}

/**
 * Resolve uma lista de ids em presets, preservando a ordem do catálogo
 * (não a ordem de clique) e descartando ids desconhecidos ou repetidos.
 * A ordem estável garante prompts determinísticos.
 */
export function resolveMotionPresets(ids: readonly string[]): MotionPreset[] {
  const wanted = new Set(ids);
  return MOTION_PRESETS.filter((p) => wanted.has(p.id));
}

/** Agrupa o catálogo por grupo, respeitando a ordem declarada. */
export function groupMotionPresets(
  presets: readonly MotionPreset[] = MOTION_PRESETS,
): { group: MotionPresetGroup; presets: MotionPreset[] }[] {
  const order: MotionPresetGroup[] = ["camera", "ritmo", "lente", "ambiente"];
  return order
    .map((group) => ({ group, presets: presets.filter((p) => p.group === group) }))
    .filter((entry) => entry.presets.length > 0);
}
