type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  requestId?: string;
  route?: string;
  err?: unknown;
  [key: string]: unknown;
}

function serializeErr(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return err;
}

function write(level: LogLevel, msg: string, fields: LogFields = {}) {
  const { err, ...rest } = fields;
  const line = {
    level,
    msg,
    time: new Date().toISOString(),
    ...rest,
    ...(err !== undefined ? { err: serializeErr(err) } : {}),
  };
  const out = JSON.stringify(line);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => write("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => write("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => write("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => write("error", msg, fields),
};
