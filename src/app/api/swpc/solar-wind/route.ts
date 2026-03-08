import { NextResponse } from 'next/server'

const SWPC_BASE = 'https://services.swpc.noaa.gov'
const ENLIL_URL = `${SWPC_BASE}/products/animations/enlil.json`

/** Parse timestamp from filename: enlil_com2_57992_20260304T100000.jpg → ISO */
function parseTimestampFromUrl(url: string): string {
  const match = url.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)
  if (!match) return new Date().toISOString()
  const [, y, mo, d, h, mi, s] = match
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`
}

interface RawFrame {
  url: string
  time_tag?: string
}

export async function GET() {
  try {
    const res = await fetch(ENLIL_URL, { next: { revalidate: 55 }, headers: { 'User-Agent': 'space-weather-app/0.1' } })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const raw: RawFrame[] = await res.json()

    const frames = raw.map((f) => ({
      url: f.url.startsWith('http') ? f.url : `${SWPC_BASE}${f.url}`,
      time_tag: f.time_tag ?? parseTimestampFromUrl(f.url),
    }))

    return NextResponse.json(frames, { headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' } })
  } catch (err) {
    console.error('[API/solar-wind]', err)
    return NextResponse.json({ error: 'Failed to fetch WSA-ENLIL frames' }, { status: 500 })
  }
}
