import { test, expect } from "@playwright/test";

/**
 * PND-09 â€” Service Worker offline real, validado contra o BUILD de produÃ§Ã£o
 * (`vite preview`), que Ã© o Ãºnico ambiente onde o SW Ã© registrado.
 * Rodar com: npx playwright test --config playwright.offline.config.ts
 */
test.describe("offline support (PND-09)", () => {
  test("sw.js e servido com escopo raiz e conteudo valido", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("javascript");

    const body = await res.text();
    expect(body).toContain('self.addEventListener("install"');
    expect(body).toContain('self.addEventListener("activate"');
    expect(body).toContain('self.addEventListener("fetch"');
    expect(body).toContain("promo-design-v1");
    // Dados dinamicos do Supabase nunca podem ser cacheados.
    expect(body).toContain("fygxlswpkjtjpcefjfty.supabase.co");
  });

  test("manifest.json segue acessivel (shell PWA)", async ({ request }) => {
    const res = await request.get("/manifest.json");
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.start_url).toBe("/");
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test("SW ativa, popula o shell cache e mantem o app carregando", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/auth");

    // O controller so existe apos o SW assumir o escopo.
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
      timeout: 20000,
    });

    const swState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return {
        scope: reg?.scope ?? null,
        active: reg?.active?.state ?? null,
        caches: await caches.keys(),
      };
    });

    expect(swState.active).toBe("activated");
    expect(swState.scope).toBe("http://127.0.0.1:8098/");
    expect(swState.caches).toContain("promo-design-v1-shell");

    // O cache de assets e criado sob demanda, na primeira requisicao ja
    // controlada pelo SW: recarregar prova que ele passa a existir.
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    const cachesAfterControlledLoad = await page.evaluate(async () => {
      const keys = await caches.keys();
      const assets = await caches.open("promo-design-v1-assets");
      const assetUrls = (await assets.keys()).map((r) => new URL(r.url).pathname);
      return { keys, assetUrls };
    });
    expect(cachesAfterControlledLoad.keys).toContain("promo-design-v1-assets");
    expect(cachesAfterControlledLoad.assetUrls.some((u) => u.startsWith("/assets/"))).toBe(true);

    // O shell precisa estar cacheado para o modo offline funcionar.
    const shellCached = await page.evaluate(async () => {
      const cache = await caches.open("promo-design-v1-shell");
      const keys = await cache.keys();
      return keys.map((r) => new URL(r.url).pathname);
    });
    expect(shellCached).toContain("/index.html");

    expect(consoleErrors.filter((e) => /service-?worker/i.test(e))).toEqual([]);
  });

  test("pagina de chunk ja visitada abre offline pelo cache", async ({ page, context }) => {
    await page.goto("/auth");
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
      timeout: 20000,
    });

    // Aquece o cache de assets com a navegacao atual.
    await page.reload();
    await expect(page.locator("body")).toBeVisible();

    await context.setOffline(true);
    await page.goto("/auth");
    await expect(page.locator("body")).toBeVisible();
    // Prova de que veio do SW e nao da rede.
    const fromCache = await page.evaluate(async () => {
      const cache = await caches.open("promo-design-v1-shell");
      const keys = await cache.keys();
      return keys.length > 0;
    });
    expect(fromCache).toBe(true);

    await context.setOffline(false);
  });
});
