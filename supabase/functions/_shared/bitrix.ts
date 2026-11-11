/**
 * Bitrix24 HTTP client with circuit breaker + exponential backoff.
 *
 * Design goals
 * ------------
 * 1. **Prevent failure cascades**: after N consecutive failures the breaker
 *    "opens" and short-circuits new requests for a cool-down window, so a
 *    Bitrix24 outage never fans out into 1000 hanging edge invocations.
 * 2. **Recover automatically**: once the cool-down expires the breaker moves
 *    to `half-open`. A single probe request decides whether to close again.
 * 3. **Retry idempotent failures**: transient errors (network, 5xx, 429,
 *    408) are retried with exponential backoff + jitter. Client errors
 *    (4xx except 408/429) fail fast — retrying them just burns quota.
 *
 * The module is intentionally stateless-per-import: each edge function
 * instance gets its own breaker, which is exactly what we want because
 * each cold-start is short-lived.
 */

// --- Errors ------------------------------------------------------------

export class BitrixCircuitOpenError extends Error {
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super(`Bitrix24 circuit breaker is OPEN; retry in ${retryAfterMs}ms`);
    this.name = "BitrixCircuitOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class BitrixRequestError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Bitrix24 request failed with status ${status}`);
    this.name = "BitrixRequestError";
    this.status = status;
    this.body = body;
  }
}

// --- Circuit breaker ---------------------------------------------------

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  /** Consecutive failures required to open the circuit. */
  failureThreshold: number;
  /** How long the circuit stays open before a probe attempt (ms). */
  cooldownMs: number;
  /** Consecutive successes required in half-open to fully close. */
  successThreshold: number;
  /** Injected clock for testability. */
  now?: () => number;
}

export const DEFAULT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  cooldownMs: 30_000,
  successThreshold: 2,
};

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private openedAt = 0;
  private readonly opts: Required<CircuitBreakerOptions>;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.opts = {
      ...DEFAULT_BREAKER_OPTIONS,
      now: () => Date.now(),
      ...options,
    } as Required<CircuitBreakerOptions>;
  }

  getState(): CircuitState {
    // Auto-transition open -> half-open when cooldown elapses.
    if (this.state === "open" && this.opts.now() - this.openedAt >= this.opts.cooldownMs) {
      this.state = "half-open";
      this.consecutiveSuccesses = 0;
    }
    return this.state;
  }

  /** Should be called BEFORE dispatching a request; throws if breaker is open. */
  assertCanRequest(): void {
    const state = this.getState();
    if (state === "open") {
      const remaining = this.opts.cooldownMs - (this.opts.now() - this.openedAt);
      throw new BitrixCircuitOpenError(Math.max(0, remaining));
    }
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.state === "half-open") {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.opts.successThreshold) {
        this.state = "closed";
        this.consecutiveSuccesses = 0;
      }
    }
  }

  recordFailure(): void {
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures++;
    if (this.state === "half-open") {
      // A single failure in half-open re-opens immediately.
      this.state = "open";
      this.openedAt = this.opts.now();
      return;
    }
    if (this.consecutiveFailures >= this.opts.failureThreshold) {
      this.state = "open";
      this.openedAt = this.opts.now();
    }
  }
}

// --- Retry / backoff ---------------------------------------------------

export interface RetryOptions {
  /** Total attempts (including the first). Must be >= 1. */
  maxAttempts: number;
  /** Base delay in ms; each retry doubles up to `maxDelayMs`. */
  baseDelayMs: number;
  /** Cap on the exponential delay. */
  maxDelayMs: number;
  /** Multiplier applied on each retry (default 2). */
  factor?: number;
  /** Injected sleep for testability. */
  sleep?: (ms: number) => Promise<void>;
  /** Injected RNG (0..1) for testability. */
  rng?: () => number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 4,
  baseDelayMs: 250,
  maxDelayMs: 5_000,
  factor: 2,
};

/**
 * Decide whether an error is safe/useful to retry. Network errors and
 * transient HTTP responses (408, 429, 5xx) qualify; deterministic 4xx
 * responses do not.
 */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof BitrixCircuitOpenError) return false;
  if (err instanceof BitrixRequestError) {
    return err.status === 408 || err.status === 429 || err.status >= 500;
  }
  // TypeError from fetch (network failure, DNS, abort) → retryable.
  if (err instanceof TypeError) return true;
  // Deno's timeout / abort error surfaces as DOMException with name "AbortError".
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
    return true;
  }
  return false;
}

/** Full-jitter exponential backoff (AWS architecture blog, "Exponential Backoff And Jitter"). */
export function computeBackoffDelay(
  attempt: number,
  opts: RetryOptions,
  rng: () => number = Math.random,
): number {
  const factor = opts.factor ?? 2;
  const exp = Math.min(opts.maxDelayMs, opts.baseDelayMs * Math.pow(factor, attempt));
  return Math.floor(rng() * exp);
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  if (opts.maxAttempts < 1) throw new Error("maxAttempts must be >= 1");
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const rng = opts.rng ?? Math.random;

  let lastError: unknown;
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isLast = attempt === opts.maxAttempts - 1;
      if (isLast || !isRetryableError(err)) throw err;
      const delay = computeBackoffDelay(attempt, opts, rng);
      await sleep(delay);
    }
  }
  // Unreachable — loop either returns or throws — but satisfies TS.
  throw lastError;
}

// --- Bitrix call wiring ------------------------------------------------

export interface BitrixCallOptions {
  /** Bitrix webhook base URL (e.g. https://portal.bitrix24.com/rest/1/xxxx/). */
  webhookBase: string;
  /** Bitrix REST method, e.g. "crm.lead.add". */
  method: string;
  /** JSON payload (Bitrix POSTs are form-encoded but accept JSON too). */
  payload?: Record<string, unknown>;
  /** Per-request timeout in ms. */
  timeoutMs?: number;
  /** Retry overrides. */
  retry?: Partial<RetryOptions>;
  /** Circuit breaker instance. Callers should reuse the same one. */
  breaker: CircuitBreaker;
  /** Injected fetch for tests. */
  fetchImpl?: typeof fetch;
}

/**
 * Execute a Bitrix24 REST call guarded by the circuit breaker and retry
 * policy. Throws `BitrixCircuitOpenError` if the breaker is open, or
 * `BitrixRequestError` after retries are exhausted.
 */
export async function bitrixCall<T = unknown>(opts: BitrixCallOptions): Promise<T> {
  const {
    webhookBase,
    method,
    payload,
    timeoutMs = 15_000,
    retry,
    breaker,
    fetchImpl = fetch,
  } = opts;

  const url = `${webhookBase.replace(/\/+$/, "")}/${method}.json`;

  return await retryWithBackoff(async () => {
    breaker.assertCanRequest();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : "{}",
        signal: controller.signal,
      });

      if (!res.ok) {
        let body: unknown = null;
        try {
          body = await res.json();
        } catch {
          /* body may be empty */
        }
        const err = new BitrixRequestError(res.status, body);
        if (isRetryableError(err)) breaker.recordFailure();
        // Non-retryable errors don't count against the breaker: they're
        // deterministic client mistakes, not signs of Bitrix being sick.
        throw err;
      }

      const data = (await res.json()) as T;
      breaker.recordSuccess();
      return data;
    } catch (err) {
      if (!(err instanceof BitrixRequestError) && isRetryableError(err)) {
        breaker.recordFailure();
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }, retry);
}
