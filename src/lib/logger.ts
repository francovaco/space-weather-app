// ============================================================
// src/lib/logger.ts — Structured JSON logger (server-side only)
// Writes ndjson to process.stdout — compatible with Vercel, Railway,
// and any platform that captures stdout for log aggregation.
// Also forwards errors to Sentry when DSN is configured.
// ============================================================
import * as Sentry from '@sentry/nextjs'

type Level = 'info' | 'warn' | 'error'

export interface LogFields {
  route?: string
  url?: string
  duration_ms?: number
  status?: number
  err?: unknown
  [key: string]: unknown
}

function write(level: Level, msg: string, fields: LogFields = {}): void {
  const { err, ...rest } = fields
  const entry: Record<string, unknown> = {
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...rest,
  }
  if (err instanceof Error) {
    entry.err = { name: err.name, message: err.message }
  } else if (err != null) {
    entry.err = String(err)
  }
  process.stdout.write(JSON.stringify(entry) + '\n')
}

export const logger = {
  info(msg: string, fields?: LogFields): void {
    write('info', msg, fields)
  },

  warn(msg: string, fields?: LogFields): void {
    write('warn', msg, fields)
  },

  error(msg: string, fields: LogFields = {}): void {
    write('error', msg, fields)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && fields.err != null) {
      try {
        const exception =
          fields.err instanceof Error ? fields.err : new Error(String(fields.err))
        Sentry.captureException(exception, {
          extra: {
            msg,
            route: fields.route,
            url: fields.url,
            duration_ms: fields.duration_ms,
          },
        })
      } catch {
        // Sentry not yet initialized — silently ignore
      }
    }
  },
}
