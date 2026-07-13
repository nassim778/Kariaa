type LogLevel = "debug" | "info" | "warn" | "error";

function write(level: LogLevel, msg: string, context?: Record<string, unknown>) {
  const prefix = `[karia:${level}]`;
  if (level === "error") console.error(prefix, msg, context ?? "");
  else if (level === "warn") console.warn(prefix, msg, context ?? "");
  else console.log(prefix, msg, context ?? "");
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => write("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => write("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => write("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => write("error", msg, ctx),
};
