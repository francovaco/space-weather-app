// ============================================================
// src/app/api/swpc/solar-cycle/route.ts
// Proxy for NOAA/SWPC Solar Cycle Progression data
// ============================================================
import { NextResponse } from 'next/server'
import { validateData, SolarCycleDataSchema } from '@/lib/schemas'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const OBSERVED_URL =
  'https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json'
const PREDICTED_URL =
  'https://services.swpc.noaa.gov/json/solar-cycle/predicted-solar-cycle.json'

export async function GET() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const [observedRes, predictedRes] = await Promise.all([
      instrumentedFetch(OBSERVED_URL, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'User-Agent': 'space-weather-app/0.1', 'Accept-Encoding': 'identity' },
      }, 'swpc/solar-cycle'),
      instrumentedFetch(PREDICTED_URL, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'User-Agent': 'space-weather-app/0.1', 'Accept-Encoding': 'identity' },
      }, 'swpc/solar-cycle'),
    ])

    if (!observedRes.ok || !predictedRes.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    }

    const [observed, predicted] = await Promise.all([
      observedRes.json(),
      predictedRes.json(),
    ])

    const validated = validateData(SolarCycleDataSchema, { observed, predicted }, 'solar-cycle')
    if (!validated.ok) return validated.response

    return NextResponse.json(
      validated.data,
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'X-Data-Source': OBSERVED_URL,
          'X-Last-Fetched': new Date().toISOString(),
        },
      },
    )
  } catch (err) {
    logger.error('Failed to fetch solar cycle data', { route: 'swpc/solar-cycle', err })
    return NextResponse.json({ error: 'Failed to fetch solar cycle data' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
