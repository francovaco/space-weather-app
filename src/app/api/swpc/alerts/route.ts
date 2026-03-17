// ============================================================
// src/app/api/swpc/alerts/route.ts
// Proxy for NOAA/SWPC official alerts, watches & warnings feed
// ============================================================
import { NextResponse } from 'next/server'
import { validateData, SwpcAlertsDataSchema } from '@/lib/schemas'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const ALERTS_URL = 'https://services.swpc.noaa.gov/products/alerts.json'

export async function GET() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await instrumentedFetch(ALERTS_URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'space-weather-app/0.1', 'Accept-Encoding': 'identity' },
    }, 'swpc/alerts')

    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const raw = await res.json()
    const validated = validateData(SwpcAlertsDataSchema, raw, 'alerts')
    if (!validated.ok) return validated.response

    return NextResponse.json(validated.data, {
      headers: {
        'Cache-Control': 'public, max-age=55, s-maxage=60',
        'X-Data-Source': ALERTS_URL,
        'X-Last-Fetched': new Date().toISOString(),
      },
    })
  } catch (err) {
    logger.error('Failed to fetch alerts', { route: 'swpc/alerts', url: ALERTS_URL, err })
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
