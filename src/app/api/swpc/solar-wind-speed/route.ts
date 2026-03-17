import { NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const URL = 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json'

export async function GET() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await instrumentedFetch(URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    }, 'swpc/solar-wind-speed')
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' },
    })
  } catch (err) {
    logger.error('Failed to fetch solar wind speed', { route: 'swpc/solar-wind-speed', url: URL, err })
    return NextResponse.json({ error: 'Failed to fetch solar wind speed' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
