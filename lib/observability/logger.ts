type LogLevel = "info" | "warn" | "error";
type LogValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogValue>;

// Only low-risk operational fields are allowed into logs. Never serialize request
// bodies, identifiers, contact details, tokens, cookies, IPs or arbitrary errors.
const SAFE_FIELDS = new Set([
  "request_id", "route", "method", "status", "duration_ms",
  "error_name", "error_code", "reason", "component", "digest",
  "operation", "result", "count",
]);

function safeContext(context: LogContext = {}) {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(context)) {
    if (!SAFE_FIELDS.has(key) || value === undefined) continue;
    if (typeof value === "string") {
      const normalized = value.replace(/[\r\n\t]/g, " ").trim().slice(0, 160);
      safe[key] = normalized || null;
    } else if (typeof value === "number") {
      if (Number.isFinite(value)) safe[key] = value;
    } else if (typeof value === "boolean" || value === null) {
      safe[key] = value;
    }
  }
  return safe;
}

function write(level: LogLevel, event: string, context: LogContext = {}) {
  const entry = {
    level,
    event: event.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100),
    occurred_at: new Date().toISOString(),
    ...safeContext(context),
  };
  const serialized = JSON.stringify(entry);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.info(serialized);
}

export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
