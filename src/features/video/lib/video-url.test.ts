import { beforeEach, describe, expect, it, vi } from "vitest";

const createSignedUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({ createSignedUrl }),
    },
  },
}));

import { isAbsoluteUrl, resolveVideoUrl } from "./video-url";

describe("isAbsoluteUrl", () => {
  it("reconhece URLs http e https", () => {
    expect(isAbsoluteUrl("https://cdn.example.com/a.mp4")).toBe(true);
    expect(isAbsoluteUrl("http://cdn.example.com/a.mp4")).toBe(true);
  });

  it("reconhece caminho de bucket como relativo", () => {
    expect(isAbsoluteUrl("org-id/video-id.mp4")).toBe(false);
  });
});

describe("resolveVideoUrl", () => {
  beforeEach(() => {
    createSignedUrl.mockReset();
  });

  it("devolve null quando não há valor", async () => {
    expect(await resolveVideoUrl(null)).toBeNull();
    expect(await resolveVideoUrl(undefined)).toBeNull();
    expect(await resolveVideoUrl("")).toBeNull();
    // Nada a assinar: não deve tocar no storage.
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("devolve URL absoluta sem pedir assinatura", async () => {
    // Fallback da edge quando o arquivamento falha: a URL do provedor já abre.
    const url = "https://cdn.example.com/video.mp4";
    expect(await resolveVideoUrl(url)).toBe(url);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("assina o caminho no bucket privado", async () => {
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed?a=1" },
      error: null,
    });

    const resolved = await resolveVideoUrl("org-id/video-id.mp4");

    expect(resolved).toBe("https://storage.example.com/signed?a=1");
    expect(createSignedUrl).toHaveBeenCalledWith("org-id/video-id.mp4", 3600);
  });

  it("devolve null quando a assinatura falha", async () => {
    createSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    expect(await resolveVideoUrl("org-id/missing.mp4")).toBeNull();
  });
});
