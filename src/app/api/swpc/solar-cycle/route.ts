// ============================================================
// src/app/api/swpc/solar-cycle/route.ts
// Proxy for NOAA/SWPC Solar Cycle Progression data
// ============================================================
import { NextResponse } from 'next/server'

const OBSERVED_URL =
  'https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json'
const PREDICTED_URL =
  'https://services.swpc.noaa.gov/json/solar-cycle/predicted-solar-cycle.json'

export async function GET() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const [observedRes, predictedRes] = await Promise.all([
      fetch(OBSERVED_URL, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'User-Agent': 'space-weather-app/0.1' },
      }),
      fetch(PREDICTED_URL, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'User-Agent': 'space-weather-app/0.1' },
      }),
    ])

    if (!observedRes.ok || !predictedRes.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    }

    const [observed, predicted] = await Promise.all([
      observedRes.json(),
      predictedRes.json(),
    ])

    return NextResponse.json(
      { observed, predicted },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'X-Data-Source': OBSERVED_URL,
          'X-Last-Fetched': new Date().toISOString(),
        },
      },
    )
  } catch (err) {
    console.error('[API/solar-cycle]', err)
    return NextResponse.json({ error: 'Failed to fetch solar cycle data' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
