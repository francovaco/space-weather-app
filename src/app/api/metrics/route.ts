// ============================================================
// src/app/api/metrics/route.ts
// Exposes per-route latency stats (p50/p95/p99) and error counts.
//
// Access control:
//   - If METRICS_SECRET env var is set: require X-Metrics-Token header.
//   - If not set in production: always 401.
//   - If not set in non-production (dev/test): open access.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getStats } from '@/lib/metrics-store'

export async function GET(req: NextRequest) {
  const secret = process.env.METRICS_SECRET

  if (secret) {
    if (req.headers.get('x-metrics-token') !== secret) {
      return new NextResponse(null, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 401 })
  }

  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      scope: 'instance',
      warning:
        'Metrics reflect a single server instance only. Not aggregated across a Lambda fleet.',
      routes: getStats(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
