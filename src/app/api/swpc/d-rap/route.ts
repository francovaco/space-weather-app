import { NextRequest, NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const SWPC_BASE = 'https://services.swpc.noaa.gov'

const VIEW_PATHS: Record<string, string> = {
  global: '/images/animations/d-rap/global/',
  'north-pole': '/images/animations/d-rap/north-pole/',
  'south-pole': '/images/animations/d-rap/south-pole/',
}

// Parse timestamp from filename like SWX_DRAP20_C_SWPC_20260308115800_GLOBAL.png
function parseTimestamp(filename: string): string | null {
  const match = filename.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`
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
    }, 'swpc/d-rap')
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const html = await res.text()
    // Extract .png filenames (exclude latest.png)
    const pngMatches = html.match(/href="([^"]+\.png)"/g) ?? []
    const filenames = pngMatches
      .map((m) => m.replace('href="', '').replace('"', ''))
      .filter((f) => f !== 'latest.png')

    const frames = filenames.map((f) => ({
      url: `${SWPC_BASE}${dirPath}${f}`,
      time_tag: parseTimestamp(f) ?? '',
    }))

    return NextResponse.json(frames, {
      headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' },
    })
  } catch (err) {
    logger.error('Failed to fetch D-RAP frames', { route: 'swpc/d-rap', url: fetchUrl, err })
    return NextResponse.json({ error: 'Failed to fetch D-RAP frames' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
