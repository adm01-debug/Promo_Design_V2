import { useEffect, useRef, useCallback, useSyncExternalStore } from "react";

// ── Shared metrics store ────────────────────────────────────
export interface PollingMetrics {
  label: string;
  requestCount: number;
  currentIntervalMs: number;
  baseIntervalMs: number;
  state: "active" | "blurred" | "hidden" | "disabled";
  lastPollAt: string | null;
}

const metricsMap = new Map<string, PollingMetrics>();
let metricsVersion = 0;
const listeners = new Set<() => void>();

function notifyListeners() {
  metricsVersion++;
  listeners.forEach((l) => l());
}

function updateMetrics(label: string, patch: Partial<PollingMetrics>) {
  const existing = metricsMap.get(label);
  if (existing) {
    Object.assign(existing, patch);
  } else {
    metricsMap.set(label, {
      label,
      requestCount: 0,
      currentIntervalMs: 0,
      baseIntervalMs: 0,
      state: "disabled",
      lastPollAt: null,
      ...patch,
    });
  }
  notifyListeners();
}

function removeMetrics(label: string) {
  metricsMap.delete(label);
  notifyListeners();
}

/** Subscribe to polling metrics from any component. */
export function usePollingMetrics(): ReadonlyArray<PollingMetrics> {
  const snapshot = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => metricsVersion,
  );
  // snapshot used to trigger re-render
  void snapshot;
  return Array.from(metricsMap.values());
}

// ── Visibility-aware polling hook ───────────────────────────

/**
 * Visibility-aware polling hook with adaptive rate limiting.
 *
 * - Pauses polling entirely when the tab is hidden (Page Visibility API).
 * - Uses a shorter interval when the tab is active and focused.
 * - Doubles the interval (up to a cap) when the tab is visible but blurred,
 *   reducing load during long idle sessions.
 * - Resets to the base interval when the user re-focuses the tab.
 */
export function useVisibilityPolling(
  callback: () => void | Promise<void>,
  /** Base polling interval in ms (used when tab is focused). */
  baseInterval: number,
  /** Whether polling is enabled at all. */
  enabled: boolean,
  /** Optional label for metrics tracking. */
  label?: string,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIntervalMs = useRef(baseInterval);
  const callbackRef = useRef(callback);
  const requestCountRef = useRef(0);
  const metricsLabel = label ?? `poll-${baseInterval}`;
  callbackRef.current = callback;

  const MAX_INTERVAL = Math.max(baseInterval * 4, 60_000);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const wrappedCallback = useCallback(() => {
    requestCountRef.current++;
    updateMetrics(metricsLabel, {
      requestCount: requestCountRef.current,
      lastPollAt: new Date().toISOString(),
    });
    callbackRef.current();
  }, [metricsLabel]);

  const startTimer = useCallback(
    (ms: number) => {
      clearTimer();
      currentIntervalMs.current = ms;
      updateMetrics(metricsLabel, { currentIntervalMs: ms });
      intervalRef.current = setInterval(wrappedCallback, ms);
    },
    [clearTimer, wrappedCallback, metricsLabel],
  );

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      updateMetrics(metricsLabel, {
        state: "disabled",
        baseIntervalMs: baseInterval,
        currentIntervalMs: 0,
      });
      return () => removeMetrics(metricsLabel);
    }

    requestCountRef.current = 0;
    updateMetrics(metricsLabel, {
      state: "active",
      baseIntervalMs: baseInterval,
      currentIntervalMs: baseInterval,
      requestCount: 0,
      lastPollAt: null,
    });

    startTimer(baseInterval);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimer();
        updateMetrics(metricsLabel, { state: "hidden", currentIntervalMs: 0 });
      } else {
        updateMetrics(metricsLabel, { state: "active" });
        wrappedCallback();
        startTimer(baseInterval);
      }
    };

    const handleFocus = () => {
      if (!document.hidden) {
        updateMetrics(metricsLabel, { state: "active" });
        wrappedCallback();
        startTimer(baseInterval);
      }
    };

    const handleBlur = () => {
      if (!document.hidden) {
        const slower = Math.min(currentIntervalMs.current * 2, MAX_INTERVAL);
        updateMetrics(metricsLabel, { state: "blurred", currentIntervalMs: slower });
        startTimer(slower);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      clearTimer();
      removeMetrics(metricsLabel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled, baseInterval, startTimer, clearTimer, MAX_INTERVAL, metricsLabel, wrappedCallback]);
}
