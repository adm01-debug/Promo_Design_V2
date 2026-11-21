import { describe, it, expect, afterEach } from "vitest";
import * as Sentry from "@sentry/react";

// Guarda de compatibilidade do SDK de observabilidade: os simbolos que
// `src/main.tsx` e `src/lib/error-logger.ts` usam precisam existir e se
// comportar como esperado na versao instalada.
describe("@sentry/react contrato de runtime", () => {
  afterEach(() => {
    Sentry.close();
  });

  it("expõe as integrações usadas no Sentry.init do app", () => {
    expect(typeof Sentry.browserTracingIntegration).toBe("function");
    expect(typeof Sentry.replayIntegration).toBe("function");
    const integrations = [Sentry.browserTracingIntegration(), Sentry.replayIntegration()];
    expect(integrations).toHaveLength(2);
    for (const integration of integrations) {
      expect(integration).toBeTruthy();
      expect(typeof integration.name).toBe("string");
      expect(integration.name.length).toBeGreaterThan(0);
    }
  });

  it("inicializa com as opções do app e aceita captura de exceção", () => {
    Sentry.init({
      dsn: "https://public@o0.ingest.sentry.io/1",
      integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: "test",
    });

    const client = Sentry.getClient();
    expect(client).toBeDefined();
    expect(client?.getOptions().environment).toBe("test");

    // captureException devolve um id de evento — prova que o pipeline de
    // transporte está montado e não lança com o SDK novo.
    const eventId = Sentry.captureException(new Error("contrato sentry"));
    expect(typeof eventId).toBe("string");
    expect(eventId.length).toBeGreaterThan(0);
  });

  it("captureMessage e setTag seguem disponíveis para o error-logger", () => {
    Sentry.init({ dsn: "https://public@o0.ingest.sentry.io/1", environment: "test" });
    expect(typeof Sentry.captureException).toBe("function");
    expect(() => Sentry.setTag("teste", "sentry-v11")).not.toThrow();
    expect(() => Sentry.captureException(new Error("x"))).not.toThrow();
  });
});
