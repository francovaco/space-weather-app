import { NextResponse } from 'next/server'

const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'

export async function GET() {
  try {
    const res = await fetch(KP_URL, {
      next: { revalidate: 55 },
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const raw: string[][] = await res.json()
    // First row is header: ['time_tag', 'Kp', 'a_running', 'station_count']
    const data = raw.slice(1).map((row) => ({
      time_tag: row[0],
      kp: parseFloat(row[1]),
      a_running: parseInt(row[2], 10),
      station_count: parseInt(row[3], 10),
    }))

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' },
    })
  } catch (err) {
    console.error('[API/kp-index]', err)
    return NextResponse.json({ error: 'Failed to fetch Kp index' }, { status: 500 })
  }
}
