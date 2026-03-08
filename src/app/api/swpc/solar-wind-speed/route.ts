import { NextResponse } from 'next/server'

const URL = 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json'

export async function GET() {
  try {
    const res = await fetch(URL, {
      next: { revalidate: 55 },
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' },
    })
  } catch (err) {
    console.error('[API/solar-wind-speed]', err)
    return NextResponse.json({ error: 'Failed to fetch solar wind speed' }, { status: 500 })
  }
}
