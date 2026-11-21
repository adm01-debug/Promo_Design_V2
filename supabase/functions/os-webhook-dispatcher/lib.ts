/**
 * Pure delivery logic for the os-webhook-dispatcher — no serve(), no
 * network topology, so it is importable from Deno unit tests without
 * starting an HTTP listener. index.ts wires it into the edge runtime.
 */

export interface QueuedOsEvent {
  event_id: string;
  os_id: string;
  event: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export const POST_TIMEOUT_MS = 15_000;

/** Sign the exact request body so the ERP can verify authenticity. */
export function signBody(body: string, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  const data = new TextEncoder().encode(body);
  return crypto.subtle
    .importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((k) => crypto.subtle.sign("HMAC", k, data))
    .then((sig) => {
      const bytes = new Uint8Array(sig);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    });
}

/**
 * Deliver one event. Returns true when the ERP accepted (2xx).
 * Exported with injectable fetch for deterministic unit tests.
 */
export async function deliverEvent(
  event: QueuedOsEvent,
  url: string,
  secret: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const body = JSON.stringify({
    event_id: event.event_id,
    event: event.event,
    os_id: event.os_id,
    payload: event.payload,
    attempts: event.attempts,
  });

  const signature = await signBody(body, secret);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event-Id": event.event_id,
      },
      body,
      signal: controller.signal,
    });
    return res.ok;
  } finally {
    clearTimeout(timer);
  }
}
