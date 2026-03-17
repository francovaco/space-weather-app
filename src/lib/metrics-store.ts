// ============================================================
// src/lib/metrics-store.ts — In-process latency metrics store
// Uses globalThis so the store survives Next.js hot-reloads in dev.
// NOTE: scope is per-instance — not aggregated across Vercel Lambdas.
// Each route keeps the last MAX_SAMPLES measurements; stats are
// computed on read (sort + percentile index).
// ============================================================

const MAX_SAMPLES = 200

interface Sample {
  duration_ms: number
  status: number
}

interface RouteMetrics {
  samples: Sample[]
  error_count: number
  last_error_at: string | null
}

declare global {
  // eslint-disable-next-line no-var
  var __metricsStore: Map<string, RouteMetrics> | undefined
}
globalThis.__metricsStore ??= new Map()

function getOrCreate(route: string): RouteMetrics {
  if (!globalThis.__metricsStore!.has(route)) {
    globalThis.__metricsStore!.set(route, {
      samples: [],
      error_count: 0,
      last_error_at: null,
    })
  }
  return globalThis.__metricsStore!.get(route)!
}

export function recordLatency(route: string, duration_ms: number, status: number): void {
  const m = getOrCreate(route)
  m.samples.push({ duration_ms, status })
  if (m.samples.length > MAX_SAMPLES) m.samples.shift()
  if (status === 0 || status >= 500) {
    m.error_count++
    m.last_error_at = new Date().toISOString()
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

export interface RouteStats {
  route: string
  count: number
  p50: number
  p95: number
  p99: number
  error_count: number
  last_error_at: string | null
}

export function getStats(): RouteStats[] {
  const result: RouteStats[] = []
  globalThis.__metricsStore!.forEach((m, route) => {
    const durations = m.samples.map((s) => s.duration_ms).sort((a, b) => a - b)
    result.push({
      route,
      count: m.samples.length,
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      error_count: m.error_count,
      last_error_at: m.last_error_at,
    })
  })
  return result.sort((a, b) => a.route.localeCompare(b.route))
}
