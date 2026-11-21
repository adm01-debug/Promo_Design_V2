/** Unit tests for the os-webhook-dispatcher delivery + signature. */
import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { deliverEvent, signBody, type QueuedOsEvent } from "./index.ts";

const EVENT: QueuedOsEvent = {
  event_id: "11111111-1111-4111-8111-111111111111",
  os_id: "22222222-2222-4222-8222-222222222222",
  event: "os.status_changed",
  payload: { os_number: "OS-001", status: "concluida", previous_status: "entregue" },
  attempts: 1,
};

Deno.test("signBody produces a 64-char lowercase hex HMAC-SHA256", async () => {
  const sig = await signBody(JSON.stringify({ a: 1 }), "sekrit");
  assertEquals(sig.length, 64);
  assertEquals(/^[0-9a-f]{64}$/.test(sig), true);
});

Deno.test("signBody is deterministic for same input+secret", async () => {
  const body = JSON.stringify({ hello: "world" });
  const a = await signBody(body, "s3cret");
  const b = await signBody(body, "s3cret");
  assertStrictEquals(a, b);
});

Deno.test("signBody differs when the secret changes", async () => {
  const body = JSON.stringify({ hello: "world" });
  const a = await signBody(body, "secret-a");
  const b = await signBody(body, "secret-b");
  assertEquals(a.length, 64);
  assertEquals(a === b, false);
});

Deno.test("deliverEvent returns true on 2xx and sets signature/event-id headers + body", async () => {
  let captured: { url: string; body: string; signature: string; eventId: string } | null = null as
    | { url: string; body: string; signature: string; eventId: string }
    | null;
  const fakeFetch = async (url: unknown, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    captured = {
      url: String(url),
      body: String(init?.body ?? ""),
      signature: headers["X-Webhook-Signature"] ?? "",
      eventId: headers["X-Webhook-Event-Id"] ?? "",
    };
    return new Response("{}", { status: 200 });
  };

  const ok = await deliverEvent(EVENT, "https://erp.example/hook", "sekrit", fakeFetch);
  assertEquals(ok, true);
  const c = captured!;
  assertEquals(c.url, "https://erp.example/hook");
  assertEquals(c.eventId, EVENT.event_id);
  const parsed = JSON.parse(c.body) as Record<string, unknown>;
  assertEquals(parsed.event_id, EVENT.event_id);
  assertEquals(parsed.event, "os.status_changed");
  assertEquals((parsed.payload as Record<string, unknown>).status, "concluida");
  assertEquals(c.signature.startsWith("sha256="), true);
  const hex = c.signature.replace("sha256=", "");
  assertEquals(/^[0-9a-f]{64}$/.test(hex), true);
});

Deno.test("deliverEvent returns false on 5xx without throwing", async () => {
  const ok = await deliverEvent(EVENT, "https://erp.example/hook", "sekrit", async () => {
    return new Response("boom", { status: 500 });
  });
  assertEquals(ok, false);
});

Deno.test("deliverEvent returns false on 4xx (ERP rejects payload)", async () => {
  const ok = await deliverEvent(EVENT, "https://erp.example/hook", "sekrit", async () => {
    return new Response("invalid", { status: 422 });
  });
  assertEquals(ok, false);
});

Deno.test("deliverEvent rethrows on network failure (retryable)", async () => {
  let threw = false;
  try {
    await deliverEvent(EVENT, "https://erp.example/hook", "sekrit", async () => {
      throw new TypeError("fetch failed");
    });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
