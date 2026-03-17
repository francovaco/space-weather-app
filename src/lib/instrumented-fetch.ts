// ============================================================
// src/lib/instrumented-fetch.ts — Drop-in fetch wrapper
// Measures latency, records it in the metrics store, and re-throws
// any errors so the caller's try/catch still fires normally.
// ============================================================
import { recordLatency } from './metrics-store'

export async function instrumentedFetch(
  url: string,
  options: RequestInit,
  route: string,
): Promise<Response> {
  const start = performance.now()
  try {
    const res = await fetch(url, options)
    recordLatency(route, Math.round(performance.now() - start), res.status)
    return res
  } catch (err) {
    recordLatency(route, Math.round(performance.now() - start), 0)
    throw err
  }
}
