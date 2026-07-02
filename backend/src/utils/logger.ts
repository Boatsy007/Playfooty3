/**
 * Structured logger — wraps console with levels and JSON output.
 * In production, pipe stdout to Supabase Logs or a log aggregator.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  ts: string
  [key: string]: unknown
}

const IS_PROD = process.env.NODE_ENV === 'production'

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = { level, message, ts: new Date().toISOString(), ...meta }
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  fn(IS_PROD ? JSON.stringify(entry) : `[${level.toUpperCase()}] ${entry.ts} — ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`)
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => emit('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => emit('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
}
