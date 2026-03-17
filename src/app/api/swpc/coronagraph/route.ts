import { NextRequest, NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const SWPC_BASE = 'https://services.swpc.noaa.gov'

// CCOR-1 full frame listing (animations endpoint is empty — use the product jpegs listing)
const CCOR1_JPEGS_URL = `${SWPC_BASE}/products/ccor1/jpegs.json`

const SOURCES: Record<string, string> = {
  'GOES-CCOR-1': CCOR1_JPEGS_URL,
  'GOES-CCOR-1-DIFF': CCOR1_JPEGS_URL, // derive diff URLs from CCOR-1 frame list
  'LASCO-C2': `${SWPC_BASE}/products/animations/lasco-c2.json`,
  'LASCO-C3': `${SWPC_BASE}/products/animations/lasco-c3.json`,
}

// Max frames to return for CCOR-1 (product listing has 2000+ frames; cap to ~10h of data)
const CCOR1_MAX_FRAMES = 120

/** Extract timestamp from filename: 20260307_1624_c2_512.jpg → ISO string */
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
    const res = await instrumentedFetch(url, { signal: controller.signal, cache: 'no-store', headers: { 'User-Agent': 'space-weather-app/0.1' } }, 'swpc/coronagraph')
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const raw: RawFrame[] = await res.json()

    // Normalize: make URLs absolute + ensure time_tag exists
    let frames = raw.map((f) => ({
      url: f.url.startsWith('http') ? f.url : `${SWPC_BASE}${f.url}`,
      time_tag: (f.time_tag && f.time_tag.length > 0) ? f.time_tag : parseTimestampFromUrl(f.url),
    }))

    if (source === 'GOES-CCOR-1') {
      // Product listing contains months of data — keep only the most recent frames
      frames = frames.slice(-CCOR1_MAX_FRAMES)
    } else if (source === 'GOES-CCOR-1-DIFF') {
      // NOAA only stores the latest diff frame; derive its URL from the last CCOR-1 frame
      const last = frames[frames.length - 1]
      if (last) {
        const diffUrl = last.url
          .replace('/products/ccor1/jpegs/', '/images/animations/ccor1-diff/')
          .replace('_ccor1_1024by960.jpg', '_ccor1_1024by960_diff.jpg')
        frames = [{ url: diffUrl, time_tag: last.time_tag }]
      }
    }

    return NextResponse.json(frames, { headers: { 'Cache-Control': 'public, max-age=270, s-maxage=300', 'X-Data-Source': url } })
  } catch (err) {
    logger.error('Failed to fetch coronagraph frames', { route: 'swpc/coronagraph', url, err })
    return NextResponse.json({ error: 'Failed to fetch coronagraph frames' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
