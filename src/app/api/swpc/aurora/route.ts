import { NextRequest, NextResponse } from 'next/server'

const SWPC_BASE = 'https://services.swpc.noaa.gov'

const ANIMATION_URLS: Record<string, string> = {
  north: `${SWPC_BASE}/products/animations/ovation_north_24h.json`,
  south: `${SWPC_BASE}/products/animations/ovation_south_24h.json`,
}

interface RawFrame {
  url: string
  time_tag: string
}

export async function GET(req: NextRequest) {
  const pole = req.nextUrl.searchParams.get('pole') ?? 'north'
  const url = ANIMATION_URLS[pole] ?? ANIMATION_URLS['north']

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const raw: RawFrame[] = await res.json()

    const frames = raw.map((f) => ({
      url: f.url.startsWith('http') ? f.url : `${SWPC_BASE}${f.url}`,
      time_tag: f.time_tag,
    }))

    return NextResponse.json(frames, {
      headers: { 'Cache-Control': 'public, max-age=280, s-maxage=300' },
    })
  } catch (err) {
    console.error('[API/aurora]', url, err)
    return NextResponse.json({ error: 'Failed to fetch aurora frames' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
