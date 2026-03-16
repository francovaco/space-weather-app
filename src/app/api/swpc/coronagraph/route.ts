import { NextRequest, NextResponse } from 'next/server'

const SWPC_BASE = 'https://services.swpc.noaa.gov'

// SWPC animation frame list endpoints (correct paths discovered from server index)
const SOURCES: Record<string, string> = {
  'GOES-CCOR-1': `${SWPC_BASE}/products/animations/ccor1/ccor1.json`,
  'GOES-CCOR-1-DIFF': `${SWPC_BASE}/products/animations/ccor1-diff/ccor1-diff.json`,
  'LASCO-C2': `${SWPC_BASE}/products/animations/lasco-c2.json`,
  'LASCO-C3': `${SWPC_BASE}/products/animations/lasco-c3.json`,
}

/** Extract timestamp from LASCO filename: 20260307_1624_c2_512.jpg → ISO string */
function parseTimestampFromUrl(url: string): string {
  const match = url.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/)
  if (!match) return new Date().toISOString()
  const [, y, mo, d, h, mi] = match
  return `${y}-${mo}-${d}T${h}:${mi}:00Z`
}

interface RawFrame {
  url: string
  time_tag?: string
}

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get('source') ?? 'GOES-CCOR-1'
  const url = SOURCES[source] ?? SOURCES['GOES-CCOR-1']
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store',headers: { 'User-Agent': 'space-weather-app/0.1' } })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const raw: RawFrame[] = await res.json()

    if (source === 'LASCO-C3') {
      console.log(`[API/coronagraph] LASCO-C3: fetched ${raw.length} frames from ${url}`)
    }

    // Normalize: make URLs absolute + ensure time_tag exists
    const frames = raw.map((f) => ({
      url: f.url.startsWith('http') ? f.url : `${SWPC_BASE}${f.url}`,
      time_tag: (f.time_tag && f.time_tag.length > 0) ? f.time_tag : parseTimestampFromUrl(f.url),
    }))

    return NextResponse.json(frames, { headers: { 'Cache-Control': 'public, max-age=580, s-maxage=600', 'X-Data-Source': url } })
  } catch (err) {
    console.error('[API/coronagraph]', url, err)
    return NextResponse.json({ error: 'Failed to fetch coronagraph frames' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
