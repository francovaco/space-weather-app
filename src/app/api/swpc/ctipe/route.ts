import { NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const SWPC_BASE = 'https://services.swpc.noaa.gov'
const CTIPE_PATH = '/images/animations/ctipe/tec/'

function parseTimestamp(filename: string): string | null {
  // Format: CTIPe-TEC_20260309T203000.png
  const match = filename.match(/(\d{8}T\d{6})/i)
  if (!match) return null
  const ts = match[1]
  const Y = ts.slice(0, 4), M = ts.slice(4, 6), D = ts.slice(6, 8)
  const h = ts.slice(9, 11), m = ts.slice(11, 13), s = ts.slice(13, 15)
  return `${Y}-${M}-${D}T${h}:${m}:${s}Z`
}

export async function GET() {
  const fetchUrl = `${SWPC_BASE}${CTIPE_PATH}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await instrumentedFetch(fetchUrl, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    }, 'swpc/ctipe')
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const html = await res.text()
    const pngMatches = html.match(/href=["']?([^"'>]*CTIPe-TEC_[^"'>]*\.png)["']?/gi) ?? []
    
    const filenames = pngMatches
      .map((m) => {
        const parts = m.match(/href=["']?([^"'>]+\.png)["']?/i)
        if (!parts) return null
        const url = parts[1]
        if (url.includes('/')) {
          const segments = url.split('/')
          return segments[segments.length - 1]
        }
        return url
      })
      .filter((f): f is string => f !== null && f !== 'latest.png')

    const uniqueFiles = Array.from(new Set(filenames))
    const frames = uniqueFiles.map((f) => ({
      url: `${SWPC_BASE}${CTIPE_PATH}${f}`,
      time_tag: parseTimestamp(f) ?? '',
    }))

    frames.sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())

    return NextResponse.json(frames, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    })
  } catch (err) {
    logger.error('Failed to fetch CTIPE frames', { route: 'swpc/ctipe', url: fetchUrl, err })
    return NextResponse.json({ error: 'Failed to fetch CTIPE frames' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
