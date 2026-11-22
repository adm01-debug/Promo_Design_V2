import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Regressao do bug de producao: o `.env` versionado trazia `VITE_FORCE_PROXY=true`
 * e o Vite inlinava isso como constante, eliminando o gate `!isDev && !FORCE_PROXY`.
 * O resultado era todo `functions.invoke` indo para `/functions/v1/<fn>` no dominio
 * do host estatico (Vercel), que responde 405 + index.html em vez de chegar ao
 * Supabase. Estes testes provam que o proxy so entra em dev.
 */

const ORIGINAL_URL = "https://fygxlswpkjtjpcefjfty.supabase.co/functions/v1/mockup-ai";

async function loadClient() {
  vi.resetModules();
  return import("@/integrations/supabase/client");
}

describe("integrations/supabase/client — proxy de Edge Functions", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("em producao nao reescreve a URL para o caminho relativo", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_FORCE_PROXY", "true");

    const { supabase } = await loadClient();
    await supabase.functions.invoke("mockup-ai", { body: { probe: 1 } });

    const calledUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.length).toBeGreaterThan(0);
    for (const url of calledUrls) {
      expect(url).not.toMatch(/^\/functions\/v1\//);
    }
    expect(calledUrls.some((url) => url.includes(ORIGINAL_URL))).toBe(true);
  });

  it("em dev mantem o proxy relativo para o dev server do Vite", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_FORCE_PROXY", "true");

    const { supabase } = await loadClient();
    await supabase.functions.invoke("mockup-ai", { body: { probe: 1 } });

    const calledUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.startsWith("/functions/v1/mockup-ai"))).toBe(true);
  });
});
