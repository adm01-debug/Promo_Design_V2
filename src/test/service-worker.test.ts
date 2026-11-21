import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SERVICE_WORKER_URL,
  registerServiceWorker,
  shouldRegisterServiceWorker,
  unregisterServiceWorkers,
} from "@/lib/service-worker";

function makeContainer(overrides: Partial<ServiceWorkerContainer> = {}) {
  return {
    register: vi.fn().mockResolvedValue({ scope: "/" }),
    getRegistrations: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as ServiceWorkerContainer;
}

describe("shouldRegisterServiceWorker", () => {
  it("registra em producao quando o navegador suporta service worker", () => {
    expect(
      shouldRegisterServiceWorker({ serviceWorker: makeContainer(), isProduction: true }),
    ).toBe(true);
  });

  it("nao registra em dev mesmo com suporte no navegador", () => {
    expect(
      shouldRegisterServiceWorker({ serviceWorker: makeContainer(), isProduction: false }),
    ).toBe(false);
  });

  it("nao registra quando o navegador nao expoe serviceWorker", () => {
    expect(shouldRegisterServiceWorker({ serviceWorker: null, isProduction: true })).toBe(false);
    expect(shouldRegisterServiceWorker({ serviceWorker: undefined, isProduction: true })).toBe(
      false,
    );
  });
});

describe("registerServiceWorker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("registra no escopo raiz usando /sw.js", async () => {
    const container = makeContainer();
    const registration = await registerServiceWorker({
      serviceWorker: container,
      isProduction: true,
    });

    expect(registration).not.toBeNull();
    expect(container.register).toHaveBeenCalledTimes(1);
    expect(container.register).toHaveBeenCalledWith(SERVICE_WORKER_URL, { scope: "/" });
  });

  it("nao chama o navegador quando o registro nao deve acontecer", async () => {
    const container = makeContainer();
    const registration = await registerServiceWorker({
      serviceWorker: container,
      isProduction: false,
    });

    expect(registration).toBeNull();
    expect(container.register).not.toHaveBeenCalled();
  });

  it("falha do registro nao propaga erro para o boot do app", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const container = makeContainer({
      register: vi.fn().mockRejectedValue(new Error("SecurityError")),
    });

    const registration = await registerServiceWorker({
      serviceWorker: container,
      isProduction: true,
    });

    expect(registration).toBeNull();
  });
});

describe("unregisterServiceWorkers", () => {
  it("desregistra todas as registrations ativas", async () => {
    const container = makeContainer({
      getRegistrations: vi
        .fn()
        .mockResolvedValue([{ unregister: vi.fn().mockResolvedValue(true) }]) as never,
    });

    const removed = await unregisterServiceWorkers(container);
    expect(removed).toBe(1);
  });

  it("retorna 0 quando nao ha container disponivel", async () => {
    expect(await unregisterServiceWorkers(null)).toBe(0);
  });

  it("erro na limpeza nao propaga", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const container = makeContainer({
      getRegistrations: vi.fn().mockRejectedValue(new Error("boom")),
    });
    expect(await unregisterServiceWorkers(container)).toBe(0);
  });
});
