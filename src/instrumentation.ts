// ============================================================
// src/instrumentation.ts — Next.js instrumentation hook
// Loads Sentry on the server/edge runtimes at startup
// ============================================================
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}
