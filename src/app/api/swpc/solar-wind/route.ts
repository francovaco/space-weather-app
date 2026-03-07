import { NextResponse } from 'next/server'

const ENLIL_URL = 'https://services.swpc.noaa.gov/products/animations/enlil.json'

export async function GET() {
  try {
    const res = await fetch(ENLIL_URL, { next: { revalidate: 55 }, headers: { 'User-Agent': 'space-weather-app/0.1' } })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' } })
  } catch (err) {
    console.error('[API/solar-wind]', err)
    return NextResponse.json({ error: 'Failed to fetch WSA-ENLIL frames' }, { status: 500 })
  }
}
