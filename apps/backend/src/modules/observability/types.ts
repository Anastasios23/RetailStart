export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  correlation_id?: string
  operation_id?: string
  principal_id?: string
  client_id?: string
  environment?: string
  [key: string]: unknown
}

export interface SanitizedErrorInfo {
  name: string
  message: string
  code?: string
  stack?: string
}

export interface StructuredLogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: SanitizedErrorInfo
}
