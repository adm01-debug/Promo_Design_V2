/**
 * Structured error logger — lightweight, local, production-ready.
 *
 * Captures errors with structured metadata (severity, context, timestamp,
 * user-agent, URL) and keeps a ring-buffer of recent entries accessible via
 * `ErrorLogger.getRecentErrors()` for in-app diagnostics.
 *
 * In development the full entry is printed to the console; in production
 * only errors/fatals are logged to console.error to avoid noise.
 */
import * as Sentry from "@sentry/react";
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  url: string;
  userAgent: string;
  context?: Record<string, unknown>;
  stack?: string;
}

const MAX_BUFFER = 100;
const buffer: LogEntry[] = [];
const isDev = import.meta.env.DEV;

function createEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  stack?: string,
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    context,
    stack,
  };
}

function push(entry: LogEntry, error?: unknown) {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  if (entry.level === "error" || entry.level === "fatal") {
    Sentry.captureException(error || new Error(entry.message), {
      extra: entry.context,
      level: entry.level === "fatal" ? "fatal" : "error",
    });
  }

  if (isDev) {
    const consoleFn =
      entry.level === "fatal" || entry.level === "error"
        ? console.error
        : entry.level === "warn"
          ? console.warn
          : console.log;
    consoleFn(`[${entry.level.toUpperCase()}]`, entry.message, entry);
  } else if (entry.level === "error" || entry.level === "fatal") {
    console.error(`[${entry.level.toUpperCase()}]`, entry.message, entry);
  }
}

// ── Public API ──────────────────────────────────────────────

export const ErrorLogger = {
  debug(message: string, context?: Record<string, unknown>) {
    push(createEntry("debug", message, context));
  },

  info(message: string, context?: Record<string, unknown>) {
    push(createEntry("info", message, context));
  },

  warn(message: string, context?: Record<string, unknown>) {
    push(createEntry("warn", message, context));
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const err = error instanceof Error ? error : undefined;
    push(
      createEntry(
        "error",
        message,
        { ...context, errorName: err?.name },
        err?.stack,
      ),
    );
  },

  fatal(message: string, error?: unknown, context?: Record<string, unknown>) {
    const err = error instanceof Error ? error : undefined;
    push(
      createEntry(
        "fatal",
        message,
        { ...context, errorName: err?.name },
        err?.stack,
      ),
    );
  },

  /** Returns a shallow copy of the ring-buffer (oldest → newest). */
  getRecentErrors(): ReadonlyArray<LogEntry> {
    return [...buffer];
  },

  /** Clears the in-memory buffer. */
  clear() {
    buffer.length = 0;
  },
};
