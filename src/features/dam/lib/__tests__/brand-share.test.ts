import { describe, expect, it } from "vitest";
import { buildSharePayload, extractShareUrl, SHARE_EDGE_FUNCTION } from "../brand-share";

describe("buildSharePayload", () => {
  it("monta o payload padrao com 30 dias", () => {
    const payload = buildSharePayload(
      { id: "11111111-1111-1111-1111-111111111111" },
      "22222222-2222-2222-2222-222222222222",
    );
    expect(payload).toEqual({
      action: "create",
      brand_guideline_id: "11111111-1111-1111-1111-111111111111",
      organization_id: "22222222-2222-2222-2222-222222222222",
      valid_days: 30,
    });
  });

  it("aceita valid_days customizado", () => {
    const payload = buildSharePayload(
      { id: "11111111-1111-1111-1111-111111111111" },
      "22222222-2222-2222-2222-222222222222",
      7,
    );
    expect(payload.valid_days).toBe(7);
  });
});

describe("extractShareUrl", () => {
  it("extrai a url do resultado", () => {
    expect(extractShareUrl({ token: "abc", url: "https://exemplo.com/brand/public/abc" })).toBe(
      "https://exemplo.com/brand/public/abc",
    );
  });

  it("retorna null quando o resultado eh vazio", () => {
    expect(extractShareUrl(null)).toBeNull();
  });
});

describe("SHARE_EDGE_FUNCTION", () => {
  it("usa a funcao brand-share", () => {
    expect(SHARE_EDGE_FUNCTION).toBe("brand-share");
  });
});
