// ============================================================
// src/app/api/swpc/aurora-ovation/route.ts
// Proxy del JSON crudo OVATION para el globo 3D de aurora
// ============================================================
import { NextResponse } from 'next/server'

const OVATION_URL =
  'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json'

export async function GET() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(OVATION_URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=280, s-maxage=300',
        'X-Data-Source': OVATION_URL,
      },
    })
  } catch (err) {
    console.error('[API/aurora-ovation]', err)
    return NextResponse.json({ error: 'Failed to fetch OVATION data' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
