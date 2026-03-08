import { NextResponse } from 'next/server'

const NOAA_SCALES_URL = 'https://services.swpc.noaa.gov/products/noaa-scales.json'

export async function GET() {
  try {
    const res = await fetch(NOAA_SCALES_URL, {
      next: { revalidate: 55 },
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' },
    })
  } catch (err) {
    console.error('[API/noaa-scales]', err)
    return NextResponse.json({ error: 'Failed to fetch NOAA scales' }, { status: 500 })
  }
}
