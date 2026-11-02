type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, string | number | boolean | null | undefined>;

function write(level: LogLevel, event: string, context: LogContext = {}) {
  const entry = {
    level,
    event,
    occurred_at: new Date().toISOString(),
    ...context,
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
