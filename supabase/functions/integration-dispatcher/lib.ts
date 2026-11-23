/**
 * Primitivas de entrega compartilhadas pelos adapters.
 *
 * Sem serve(), sem topologia de rede: importavel de teste Deno sem subir
 * listener HTTP. index.ts liga isso ao runtime da edge function.
 */

export const POST_TIMEOUT_MS = 15_000;

/** HMAC-SHA256 hex do corpo exato enviado (mesmo formato dos destinos). */
export async function signBody(body: string, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  const data = new TextEncoder().encode(body);
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", k, data);
  const bytes = new Uint8Array(sig);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface PostResult {
  ok: boolean;
  status: number;
  body: string;
}

/**
 * POST autenticado com timeout. Nunca lanca: erro de rede vira
 * `{ ok: false, status: 0 }` para o chamador decidir se e retryavel.
 */
export async function postJson(
  url: string,
  body: string,
  headers: Record<string, string>,
  fetchImpl: typeof fetch,
  timeoutMs: number = POST_TIMEOUT_MS,
): Promise<PostResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, body: text.slice(0, 500) };
  } catch (_err) {
    return { ok: false, status: 0, body: "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

/** Data no formato YYYY-MM-DD (aceita ISO completo vindo do Postgres). */
export function toIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length < 10) return undefined;
  const d = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;
}

/** Texto nao-vazio ou undefined (evita mandar "" para campos com min(1)). */
export function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/** Numero finito e positivo, ou undefined. */
export function positiveNumber(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
