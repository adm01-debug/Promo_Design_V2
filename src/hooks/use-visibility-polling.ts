import { useEffect, useRef, useCallback } from "react";

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
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIntervalMs = useRef(baseInterval);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const MAX_INTERVAL = Math.max(baseInterval * 4, 60_000); // cap at 4× or 60s

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (ms: number) => {
      clearTimer();
      currentIntervalMs.current = ms;
      intervalRef.current = setInterval(() => {
        callbackRef.current();
      }, ms);
    },
    [clearTimer],
  );

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      return;
    }

    // Start with base interval
    startTimer(baseInterval);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden → stop polling entirely
        clearTimer();
      } else {
        // Tab visible again → poll immediately then resume at base rate
        callbackRef.current();
        startTimer(baseInterval);
      }
    };

    const handleFocus = () => {
      // User focused → reset to base interval and poll now
      if (!document.hidden) {
        callbackRef.current();
        startTimer(baseInterval);
      }
    };

    const handleBlur = () => {
      // Tab still visible but blurred → slow down polling
      if (!document.hidden) {
        const slower = Math.min(currentIntervalMs.current * 2, MAX_INTERVAL);
        startTimer(slower);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled, baseInterval, startTimer, clearTimer, MAX_INTERVAL]);
}
