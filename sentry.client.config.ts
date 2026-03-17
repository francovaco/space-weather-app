// ============================================================
// sentry.client.config.ts — Sentry browser SDK initialization
// ============================================================
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of traces in production; increase for debugging
  tracesSampleRate: 0.1,

  // Replay 10% of sessions, 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.replayIntegration()],

  debug: false,
})
