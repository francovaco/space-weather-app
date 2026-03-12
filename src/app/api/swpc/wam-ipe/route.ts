import { NextRequest, NextResponse } from 'next/server'

const SWPC_BASE = 'https://services.swpc.noaa.gov'

const VIEW_PATHS: Record<string, string> = {
  'neutral-nowcast': '/images/animations/wam-ipe/wrs_neutral/',
  'ionosphere-nowcast': '/images/animations/wam-ipe/wrs_ionosphere/',
  'neutral-forecast': '/images/animations/wam-ipe/wfs_neutral_new/',
  'ionosphere-forecast': '/images/animations/wam-ipe/wfs_ionosphere_new/',
}

// Parse timestamp from the second date in filenames like:
// WRS_WAM05_GLOBAL_DEN400-ON2-DEN400_20260308T0900_20260308T1010.png
// or WFS_GLOBAL_TEC-MUF-TECAnom-MUFAnom_20260308T1200_20260308T1310.png
// We use the second timestamp (valid time)
function parseTimestamp(filename: string): string | null {
  const matches = filename.match(/(\d{8}T\d{4})/g)
  if (!matches || matches.length < 2) return null
  const ts = matches[matches.length - 1] // Take the last one
  const Y = ts.slice(0, 4), M = ts.slice(4, 6), D = ts.slice(6, 8)
  const h = ts.slice(9, 11), m = ts.slice(11, 13)
  return `${Y}-${M}-${D}T${h}:${m}:00Z`
}

export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get('view') ?? 'neutral-nowcast'
  const dirPath = VIEW_PATHS[view] ?? VIEW_PATHS['neutral-nowcast']

  try {
    const res = await fetch(`${SWPC_BASE}${dirPath}`, {
      next: { revalidate: 55 },
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const html = await res.text()
    const pngMatches = html.match(/href="([^"]+\.png)"/g) ?? []
    const filenames = pngMatches
      .map((m) => m.replace('href="', '').replace('"', ''))
      .filter((f) => f !== 'latest.png')

    const frames = filenames
      .map((f) => ({
        url: `${SWPC_BASE}${dirPath}${f}`,
        time_tag: parseTimestamp(f) ?? '',
      }))
      .filter((f) => f.time_tag !== '')
      .sort((a, b) => a.time_tag.localeCompare(b.time_tag))
      .slice(-150) // Limit to a reasonable number

    return NextResponse.json(frames, {
      headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' },
    })
  } catch (err) {
    console.error('[API/wam-ipe]', err)
    return NextResponse.json({ error: 'Failed to fetch WAM-IPE frames' }, { status: 500 })
  }
}
