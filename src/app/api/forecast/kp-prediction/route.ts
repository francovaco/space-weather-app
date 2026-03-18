// ============================================================
// src/app/api/forecast/kp-prediction/route.ts
// Proxies to Python LSTM microservice for Kp prediction.
// Falls back gracefully when the service is unavailable.
// ============================================================
import { NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const FORECAST_SERVICE_URL = process.env.FORECAST_SERVICE_URL

export async function GET() {
  if (!FORECAST_SERVICE_URL) {
    // Service not configured — return 503 so client shows fallback
    return NextResponse.json(
      { error: 'Forecast service not configured', available: false },
      { status: 503 },
    )
  }

  const ac = new AbortController()
  const tid = setTimeout(() => ac.abort(), 10000)
  try {
    const res = await instrumentedFetch(`${FORECAST_SERVICE_URL}/predict`, {
      signal: ac.signal,
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    }, 'forecast/kp-prediction')

    if (!res.ok) {
      logger.warn('Forecast service returned error', {
        route: 'forecast/kp-prediction',
        url: `${FORECAST_SERVICE_URL}/predict`,
        status: res.status,
      })
      return NextResponse.json({ error: 'Forecast service error', available: false }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' },
    })
  } catch (err) {
    logger.warn('Forecast service unreachable', {
      route: 'forecast/kp-prediction',
      url: FORECAST_SERVICE_URL,
      err,
    })
    return NextResponse.json({ error: 'Forecast service unreachable', available: false }, { status: 503 })
  } finally {
    clearTimeout(tid)
  }
}
