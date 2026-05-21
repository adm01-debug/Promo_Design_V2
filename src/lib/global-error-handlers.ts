/**
 * Installs global error handlers (window.onerror + unhandledrejection).
 * Call once at app startup (main.tsx).
 */
import { ErrorLogger } from "./error-logger";

export function installGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    ErrorLogger.fatal("Uncaught error", event.error ?? new Error(event.message), {
      source: event.filename,
      line: event.lineno,
      col: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    ErrorLogger.fatal("Unhandled promise rejection", error);
  });

  ErrorLogger.info("Global error handlers installed");
}
