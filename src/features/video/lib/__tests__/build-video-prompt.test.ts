import { describe, it, expect } from "vitest";
import { buildVideoPrompt } from "../build-video-prompt";
import {
  MOTION_PRESETS,
  getMotionPreset,
  groupMotionPresets,
  resolveMotionPresets,
} from "../motion-presets";

const base = {
  productName: "Caneca Térmica",
  aspectRatio: "9:16",
  durationSeconds: 5,
};

describe("motion-presets", () => {
  it("não possui ids duplicados", () => {
    const ids = MOTION_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todo preset tem fragmento de prompt não vazio", () => {
    for (const p of MOTION_PRESETS) {
      expect(p.promptFragment.trim().length).toBeGreaterThan(0);
      expect(p.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("resolve ids preservando a ordem do catálogo", () => {
    const resolved = resolveMotionPresets(["golden-hour", "crash-zoom"]);
    expect(resolved.map((p) => p.id)).toEqual(["crash-zoom", "golden-hour"]);
  });

  it("descarta ids desconhecidos e repetidos", () => {
    const resolved = resolveMotionPresets(["macro", "inexistente", "macro"]);
    expect(resolved.map((p) => p.id)).toEqual(["macro"]);
  });

  it("agrupa cobrindo todos os presets", () => {
    const total = groupMotionPresets().reduce((acc, g) => acc + g.presets.length, 0);
    expect(total).toBe(MOTION_PRESETS.length);
  });

  it("getMotionPreset retorna undefined para id inválido", () => {
    expect(getMotionPreset("nope")).toBeUndefined();
    expect(getMotionPreset("orbit")?.label).toBe("Órbita 360°");
  });
});

describe("buildVideoPrompt", () => {
  it("é determinístico e independente da ordem de seleção", () => {
    const a = buildVideoPrompt({ ...base, motionPresetIds: ["macro", "crash-zoom"] });
    const b = buildVideoPrompt({ ...base, motionPresetIds: ["crash-zoom", "macro"] });
    expect(a).toBe(b);
    expect(a).toBe(buildVideoPrompt({ ...base, motionPresetIds: ["macro", "crash-zoom"] }));
  });

  it("inclui produto, duração, formato e trava de fidelidade", () => {
    const prompt = buildVideoPrompt(base);
    expect(prompt).toContain("5s product film of Caneca Térmica");
    expect(prompt).toContain("9:16 aspect ratio");
    expect(prompt).toContain("true to its real shape and colours");
    expect(prompt.endsWith(".")).toBe(true);
  });

  it("inclui o SKU quando informado", () => {
    expect(buildVideoPrompt({ ...base, productSku: "CT-100" })).toContain("(SKU CT-100)");
  });

  it("deduplica fragmentos equivalentes ignorando caixa e pontuação", () => {
    const prompt = buildVideoPrompt({
      ...base,
      extraInstructions: "9:16 Aspect Ratio.",
    });
    expect(prompt.match(/aspect ratio/gi)?.length).toBe(1);
  });

  it("ignora presets desconhecidos sem quebrar", () => {
    expect(() =>
      buildVideoPrompt({ ...base, motionPresetIds: ["fantasma"] }),
    ).not.toThrow();
  });

  it("incorpora moodboard, cinema e personagem", () => {
    const prompt = buildVideoPrompt({
      ...base,
      videoStyle: "premium",
      characterDescription: "a young female brand ambassador",
      moodboard: {
        tone: "luxuoso",
        palette: "escuro",
        scenes: ["a marble countertop"],
        customColors: [],
        keywords: ["editorial"],
      },
      cinema: {
        presetId: "teal",
        presetLabel: "Teal & Orange",
        lighting: "soft",
        lightingLabel: "Soft",
        letterbox: true,
        grain: true,
        filters: { temperature: 0, contrast: 0, saturation: 0, brightness: 0, vignette: 0 },
      },
    });
    expect(prompt).toContain("premium advertising film look");
    expect(prompt).toContain("featuring a young female brand ambassador");
    expect(prompt).toContain("luxurious, high-end mood");
    expect(prompt).toContain("dark moody colour palette");
    expect(prompt).toContain("set in a marble countertop");
    expect(prompt).toContain("Teal & Orange colour grade");
    expect(prompt).toContain("cinematic letterbox bars");
    expect(prompt).toContain("subtle film grain");
  });

  it("não emite fragmentos vazios quando tudo é opcional", () => {
    const prompt = buildVideoPrompt({ ...base, extraInstructions: "   " });
    expect(prompt).not.toContain(", ,");
    expect(prompt).not.toContain("  ");
  });
});
