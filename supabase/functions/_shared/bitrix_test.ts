/**
 * Unit tests for the Bitrix24 circuit-breaker + retry helper.
 *
 * These tests inject fake timers, fake RNG, and a fake fetch so we can
 * exercise the state machine deterministically — no real network, no
 * flaky sleeps.
 */
import {
  assertEquals,
  assertRejects,
  assertStrictEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  bitrixCall,
  BitrixCircuitOpenError,
  BitrixRequestError,
  CircuitBreaker,
  computeBackoffDelay,
  isRetryableError,
  retryWithBackoff,
} from "./bitrix.ts";

// -- CircuitBreaker ----------------------------------------------------

Deno.test("breaker starts closed and stays closed while under threshold", () => {
  const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
  cb.recordFailure();
  cb.recordFailure();
  assertEquals(cb.getState(), "closed");
});

Deno.test("breaker opens after failureThreshold consecutive failures", () => {
  const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
  cb.recordFailure(); cb.recordFailure(); cb.recordFailure();
  assertEquals(cb.getState(), "open");
});

Deno.test("assertCanRequest throws BitrixCircuitOpenError when open", () => {
  const now = 1000;
  const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 5000, now: () => now });
  cb.recordFailure();
  try {
    cb.assertCanRequest();
    throw new Error("should have thrown");
  } catch (e) {
    assertStrictEquals(e instanceof BitrixCircuitOpenError, true);
    if (e instanceof BitrixCircuitOpenError) {
      assertEquals(e.retryAfterMs, 5000);
    }
  }
});

Deno.test("breaker transitions to half-open after cooldown", () => {
  let now = 0;
  const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000, now: () => now });
  cb.recordFailure();
  assertEquals(cb.getState(), "open");
  now = 999;
  assertEquals(cb.getState(), "open");
  now = 1000;
  assertEquals(cb.getState(), "half-open");
});

Deno.test("half-open closes after successThreshold successes", () => {
  let now = 0;
  const cb = new CircuitBreaker({
    failureThreshold: 1,
    cooldownMs: 1000,
    successThreshold: 2,
    now: () => now,
  });
  cb.recordFailure();
  now = 1000; // -> half-open
  assertEquals(cb.getState(), "half-open");
  cb.recordSuccess();
  assertEquals(cb.getState(), "half-open");
  cb.recordSuccess();
  assertEquals(cb.getState(), "closed");
});

Deno.test("a failure in half-open re-opens the circuit immediately", () => {
  let now = 0;
  const cb = new CircuitBreaker({
    failureThreshold: 1,
    cooldownMs: 1000,
    successThreshold: 2,
    now: () => now,
  });
  cb.recordFailure();
  now = 1000;
  assertEquals(cb.getState(), "half-open");
  cb.recordFailure();
  assertEquals(cb.getState(), "open");
});

Deno.test("a success resets the consecutive-failure counter", () => {
  const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
  cb.recordFailure();
  cb.recordFailure();
  cb.recordSuccess();
  cb.recordFailure();
  cb.recordFailure();
  assertEquals(cb.getState(), "closed"); // only 2 fresh failures
});

// -- isRetryableError --------------------------------------------------

Deno.test("isRetryableError: 5xx and 408/429 are retryable, other 4xx are not", () => {
  assertEquals(isRetryableError(new BitrixRequestError(500, null)), true);
  assertEquals(isRetryableError(new BitrixRequestError(502, null)), true);
  assertEquals(isRetryableError(new BitrixRequestError(408, null)), true);
  assertEquals(isRetryableError(new BitrixRequestError(429, null)), true);
  assertEquals(isRetryableError(new BitrixRequestError(400, null)), false);
  assertEquals(isRetryableError(new BitrixRequestError(401, null)), false);
  assertEquals(isRetryableError(new BitrixRequestError(404, null)), false);
});

Deno.test("isRetryableError: network TypeError is retryable", () => {
  assertEquals(isRetryableError(new TypeError("fetch failed")), true);
});

Deno.test("isRetryableError: AbortError is retryable", () => {
  const e = new Error("aborted"); e.name = "AbortError";
  assertEquals(isRetryableError(e), true);
});

Deno.test("isRetryableError: circuit-open is NOT retryable inside retry loop", () => {
  assertEquals(isRetryableError(new BitrixCircuitOpenError(1000)), false);
});

// -- computeBackoffDelay ----------------------------------------------

Deno.test("computeBackoffDelay respects maxDelayMs and factor", () => {
  // rng always 1 → returns floor(cap) - 1 ish
  const opts = { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 800, factor: 2 };
  // Attempt 0: min(800, 100*1)=100
  // Attempt 1: min(800, 100*2)=200
  // Attempt 2: min(800, 100*4)=400
  // Attempt 3: min(800, 100*8)=800 (capped)
  // Attempt 4: still 800
  const rng = () => 0.999;
  assertEquals(computeBackoffDelay(0, opts, rng), 99);
  assertEquals(computeBackoffDelay(1, opts, rng), 199);
  assertEquals(computeBackoffDelay(2, opts, rng), 399);
  assertEquals(computeBackoffDelay(3, opts, rng), 799);
  assertEquals(computeBackoffDelay(4, opts, rng), 799);
});

Deno.test("computeBackoffDelay returns 0 when rng is 0", () => {
  const opts = { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 800 };
  assertEquals(computeBackoffDelay(3, opts, () => 0), 0);
});

// -- retryWithBackoff -------------------------------------------------

Deno.test("retryWithBackoff returns immediately on success", async () => {
  let calls = 0;
  const result = await retryWithBackoff(async () => { calls++; return 42; });
  assertEquals(result, 42);
  assertEquals(calls, 1);
});

Deno.test("retryWithBackoff retries on retryable error until success", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const result = await retryWithBackoff(
    async () => {
      calls++;
      if (calls < 3) throw new BitrixRequestError(503, null);
      return "ok";
    },
    {
      maxAttempts: 4,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      sleep: async (ms) => { sleeps.push(ms); },
      rng: () => 0.5,
    },
  );
  assertEquals(result, "ok");
  assertEquals(calls, 3);
  assertEquals(sleeps.length, 2); // 2 retries → 2 sleeps
});

Deno.test("retryWithBackoff throws non-retryable errors on the first attempt", async () => {
  let calls = 0;
  await assertRejects(
    () => retryWithBackoff(
      async () => { calls++; throw new BitrixRequestError(400, { error: "bad input" }); },
      { maxAttempts: 4, baseDelayMs: 10, maxDelayMs: 100, sleep: async () => {} },
    ),
    BitrixRequestError,
  );
  assertEquals(calls, 1);
});

Deno.test("retryWithBackoff surfaces the last error after exhausting attempts", async () => {
  let calls = 0;
  await assertRejects(
    () => retryWithBackoff(
      async () => { calls++; throw new BitrixRequestError(502, null); },
      { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10, sleep: async () => {}, rng: () => 0 },
    ),
    BitrixRequestError,
  );
  assertEquals(calls, 3);
});

// -- bitrixCall integration ------------------------------------------

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.test("bitrixCall returns parsed JSON on success", async () => {
  const breaker = new CircuitBreaker();
  const fakeFetch: typeof fetch = async () =>
    jsonResponse(200, { result: { id: 42 } });
  const data = await bitrixCall<{ result: { id: number } }>({
    webhookBase: "https://portal.bitrix24.com/rest/1/tok/",
    method: "crm.lead.add",
    breaker,
    fetchImpl: fakeFetch,
    retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, sleep: async () => {} },
  });
  assertEquals(data.result.id, 42);
});

Deno.test("bitrixCall records failures against the breaker on retryable errors", async () => {
  const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 10_000 });
  const fakeFetch: typeof fetch = async () => jsonResponse(503, { error: "boom" });
  await assertRejects(() => bitrixCall({
    webhookBase: "https://portal.bitrix24.com/rest/1/tok/",
    method: "crm.lead.add",
    breaker,
    fetchImpl: fakeFetch,
    retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1, sleep: async () => {}, rng: () => 0 },
  }));
  // 2 attempts × 1 retryable failure each = 2 breaker failures → open
  assertEquals(breaker.getState(), "open");
});

Deno.test("bitrixCall does NOT count non-retryable 4xx against the breaker", async () => {
  const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10_000 });
  const fakeFetch: typeof fetch = async () => jsonResponse(400, { error: "bad" });
  await assertRejects(() => bitrixCall({
    webhookBase: "https://portal.bitrix24.com/rest/1/tok/",
    method: "crm.lead.add",
    breaker,
    fetchImpl: fakeFetch,
    retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, sleep: async () => {} },
  }));
  assertEquals(breaker.getState(), "closed");
});

Deno.test("bitrixCall short-circuits when breaker is open", async () => {
  const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10_000 });
  breaker.recordFailure(); // force open
  let fetchCalls = 0;
  const fakeFetch: typeof fetch = async () => { fetchCalls++; return jsonResponse(200, {}); };
  await assertRejects(
    () => bitrixCall({
      webhookBase: "https://portal.bitrix24.com/rest/1/tok/",
      method: "crm.lead.add",
      breaker,
      fetchImpl: fakeFetch,
      retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1, sleep: async () => {} },
    }),
    BitrixCircuitOpenError,
  );
  assertEquals(fetchCalls, 0); // fetch was never invoked
});
