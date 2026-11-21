/**
 * Registro do Service Worker de suporte offline (PND-09).
 *
 * Falha silenciosa por design: navegador sem suporte, contexto inseguro ou
 * registro recusado nao devem quebrar o boot do app. O Service Worker e uma
 * melhoria progressiva - sem ele o sistema segue funcionando 100% online.
 */

export const SERVICE_WORKER_URL = "/sw.js";

export interface ServiceWorkerEnvironment {
  /** `navigator.serviceWorker` do contexto atual. */
  serviceWorker?: ServiceWorkerContainer | null;
  /** Usado para decidir entre producao (registrar) e dev (nao registrar). */
  isProduction: boolean;
}

/**
 * Service Worker exige contexto seguro (HTTPS ou localhost). Em dev o Vite
 * serve modulos sem hash e o SW acabaria servindo cache obsoleto, por isso ele
 * so e registrado em build de producao.
 */
export function shouldRegisterServiceWorker(env: ServiceWorkerEnvironment): boolean {
  if (!env.isProduction) return false;
  if (typeof env.serviceWorker === "undefined" || env.serviceWorker === null) return false;
  if (!("register" in env.serviceWorker)) return false;
  return true;
}

export async function registerServiceWorker(
  env: ServiceWorkerEnvironment,
): Promise<ServiceWorkerRegistration | null> {
  if (!shouldRegisterServiceWorker(env)) return null;

  try {
    const registration = await env.serviceWorker!.register(SERVICE_WORKER_URL, {
      scope: "/",
    });
    return registration;
  } catch (error) {
    console.warn("[service-worker] registro falhou", error);
    return null;
  }
}

export async function unregisterServiceWorkers(
  serviceWorker?: ServiceWorkerContainer | null,
): Promise<number> {
  const container = serviceWorker ?? globalThis.navigator?.serviceWorker;
  if (!container || typeof container.getRegistrations !== "function") return 0;

  try {
    const registrations = await container.getRegistrations();
    const results = await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
    return results.filter(Boolean).length;
  } catch (error) {
    console.warn("[service-worker] limpeza falhou", error);
    return 0;
  }
}

/**
 * Dispara o registro no boot. Chamado por `main.tsx` de forma fire-and-forget.
 */
export function bootstrapServiceWorker(): void {
  if (typeof window === "undefined") return;

  void registerServiceWorker({
    serviceWorker: globalThis.navigator?.serviceWorker ?? null,
    isProduction: import.meta.env.PROD,
  });
}
