import { NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const NOAA_SCALES_URL = 'https://services.swpc.noaa.gov/products/noaa-scales.json'

export async function GET() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await instrumentedFetch(NOAA_SCALES_URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    }, 'swpc/noaa-scales')
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' },
    })
  } catch (err) {
    logger.error('Failed to fetch NOAA scales', { route: 'swpc/noaa-scales', url: NOAA_SCALES_URL, err })
    return NextResponse.json({ error: 'Failed to fetch NOAA scales' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
