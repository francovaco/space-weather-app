import { NextRequest, NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const SWPC_BASE = 'https://services.swpc.noaa.gov'

const VIEW_PATHS: Record<string, string> = {
  global: '/images/animations/geospace/global/',
  'polar-lt': '/images/animations/geospace/polar_lt/',
}

// Parse timestamp from filename like Global_20260316T1330_20260316T155200.png
// Use the second (end) timestamp as the frame time
function parseTimestamp(filename: string): string | null {
  const parts = filename.replace('.png', '').split('_')
  // Last segment is the end timestamp, e.g. 20260316T155200
  const raw = parts[parts.length - 1]
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? '00'}Z`
}

export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get('view') ?? 'global'
  const dirPath = VIEW_PATHS[view] ?? VIEW_PATHS['global']
  const fetchUrl = `${SWPC_BASE}${dirPath}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await instrumentedFetch(fetchUrl, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    }, 'swpc/geo-mag-perturbations')
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const html = await res.text()
    const pngMatches = html.match(/href="([^"]+\.png)"/g) ?? []
    const filenames = pngMatches
      .map((m) => m.replace('href="', '').replace('"', ''))
      .filter((f) => f !== 'latest.png')

    const frames = filenames.map((f) => ({
      url: `${SWPC_BASE}${dirPath}${f}`,
      time_tag: parseTimestamp(f) ?? '',
    }))

    return NextResponse.json(frames, {
      headers: {
        'Cache-Control': 'public, max-age=55, s-maxage=60',
        'X-Data-Source': fetchUrl,
        'X-Last-Fetched': new Date().toISOString(),
      },
    })
  } catch (err) {
    logger.error('Failed to fetch geomagnetic perturbation frames', { route: 'swpc/geo-mag-perturbations', url: fetchUrl, err })
    return NextResponse.json({ error: 'Failed to fetch geomagnetic perturbation frames' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
