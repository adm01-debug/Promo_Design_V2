/**
 * Structured error logger — lightweight, local, production-ready.
 *
 * Captures errors with structured metadata (severity, context, timestamp,
 * user-agent, URL, requestId) and keeps a ring-buffer of recent entries.
 *
 * Integrated with Sentry and centralized console logging.
 */

import * as Sentry from "@sentry/react";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  url: string;
  userAgent: string;
  requestId?: string;
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
    requestId: (context?.requestId as string) || undefined,
    context,
    stack,
  };
}

function push(entry: LogEntry, error?: unknown) {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  // Send to Sentry if high severity
  if (entry.level === "error" || entry.level === "fatal") {
    Sentry.captureException(error || new Error(entry.message), {
      extra: {
        ...entry.context,
        requestId: entry.requestId,
        url: entry.url,
      },
      level: entry.level === "fatal" ? "fatal" : "error",
      tags: {
        requestId: entry.requestId,
      },
    });
  }

  // Structured console output
  const logData = {
    ...entry,
    // Avoid circular refs or huge objects in context if any
  };

  if (isDev) {
    const consoleFn =
      entry.level === "fatal" || entry.level === "error"
        ? console.error
        : entry.level === "warn"
          ? console.warn
          : console.log;

    // In dev, we use a more readable output but still provide the structured data
    consoleFn(
      `[${entry.level.toUpperCase()}]${entry.requestId ? ` [RID:${entry.requestId}]` : ""} ${entry.message}`,
      logData,
    );
  } else if (entry.level === "error" || entry.level === "fatal" || entry.level === "warn") {
    // In production, we log as JSON for structured log collectors
    console.log(JSON.stringify(logData));
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
    push(createEntry("error", message, { ...context, errorName: err?.name }, err?.stack), error);
  },

  fatal(message: string, error?: unknown, context?: Record<string, unknown>) {
    const err = error instanceof Error ? error : undefined;
    push(createEntry("fatal", message, { ...context, errorName: err?.name }, err?.stack), error);
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
