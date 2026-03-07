import { NextRequest, NextResponse } from 'next/server'

// SWPC animation frame list endpoints
const SOURCES: Record<string, string> = {
  'GOES-CCOR-1': 'https://services.swpc.noaa.gov/products/animations/goes-ccor1.json',
  'GOES-CCOR-1-DIFF': 'https://services.swpc.noaa.gov/products/animations/goes-ccor1-diff.json',
  'LASCO-C2': 'https://services.swpc.noaa.gov/products/animations/lasco-c2.json',
  'LASCO-C3': 'https://services.swpc.noaa.gov/products/animations/lasco-c3.json',
}

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get('source') ?? 'GOES-CCOR-1'
  const url = SOURCES[source] ?? SOURCES['GOES-CCOR-1']
  try {
    const res = await fetch(url, { next: { revalidate: 580 }, headers: { 'User-Agent': 'space-weather-app/0.1' } })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=580, s-maxage=600', 'X-Data-Source': url } })
  } catch (err) {
    console.error('[API/coronagraph]', err)
    return NextResponse.json({ error: 'Failed to fetch coronagraph frames' }, { status: 500 })
  }
}
