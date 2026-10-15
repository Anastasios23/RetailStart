import { redactSensitiveData, sanitizeError } from "./redaction"
import { LogContext, LogLevel, StructuredLogEntry } from "./types"

export type LogWriter = (entry: StructuredLogEntry) => void

const defaultConsoleWriter: LogWriter = (entry) => {
  const json = JSON.stringify(entry)
  if (entry.level === "error") {
    console.error(json)
  } else if (entry.level === "warn") {
    console.warn(json)
  } else {
    console.log(json)
  }
}

export class StructuredLogger {
  constructor(private writer: LogWriter = defaultConsoleWriter) {}

  log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    err?: unknown
  ): StructuredLogEntry {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context
        ? (redactSensitiveData(context) as LogContext)
        : undefined,
      error: err ? sanitizeError(err) : undefined,
    }

    this.writer(entry)
    return entry
  }

  debug(message: string, context?: LogContext): StructuredLogEntry {
    return this.log("debug", message, context)
  }

  info(message: string, context?: LogContext): StructuredLogEntry {
    return this.log("info", message, context)
  }

  warn(message: string, context?: LogContext, err?: unknown): StructuredLogEntry {
    return this.log("warn", message, context, err)
  }

  error(message: string, context?: LogContext, err?: unknown): StructuredLogEntry {
    return this.log("error", message, context, err)
  }
}

export const logger = new StructuredLogger()
