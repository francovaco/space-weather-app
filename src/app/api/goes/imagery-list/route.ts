// ============================================================
// src/app/api/goes/imagery-list/route.ts
// Fetches the CDN directory listing for a GOES-19 sector/band
// and returns sorted list of image URLs.
//
// Usage: GET /api/goes/imagery-list?sector=ssa&band=GEOCOLOR&count=24&res=600
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

const CDN_BASE = 'https://cdn.star.nesdis.noaa.gov'
const SAT = 'GOES19'

// Resolutions available on the CDN
export const RESOLUTIONS = ['300', '600', '1200', '2400'] as const
export type Resolution = typeof RESOLUTIONS[number]

export interface ImageFrame {
  url: string
  timestamp: string   // ISO-8601 UTC
  label: string       // "7 Mar 2026 - 18:00 UTC"
  filename: string
}

export interface ImageryListResponse {
  frames: ImageFrame[]
  latestUrl: string   // direct symlink to latest image
  gifUrl: string      // animated GIF (pre-built by NOAA)
  cdnDir: string
  fetchedAt: string
  error?: string
}

// Parse NOAA timestamp format: YYYYDDDHHMM → ISO date
// e.g. "20261160845" → 2026, day 116, 08:45 UTC
function parseNOAATimestamp(ts: string): Date | null {
  try {
    const year  = parseInt(ts.slice(0, 4), 10)
    const doy   = parseInt(ts.slice(4, 7), 10)   // day of year
    const hh    = parseInt(ts.slice(7, 9), 10)
    const mm    = parseInt(ts.slice(9, 11), 10)

    // Day of year → calendar date
    const date = new Date(Date.UTC(year, 0, 1))
    date.setUTCDate(date.getUTCDate() + doy - 1)
    date.setUTCHours(hh, mm, 0, 0)
    return date
  } catch {
    return null
  }
}

function formatLabel(ts: string): string {
  const d = parseNOAATimestamp(ts)
  if (!d) return ts
  const day   = d.getUTCDate().toString().padStart(2, '0')
  const month = d.toLocaleString('es-AR', { month: 'short', timeZone: 'UTC' })
  const year  = d.getUTCFullYear()
  const hhmm  = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`
  return `${day} ${month.charAt(0).toUpperCase() + month.slice(1)} ${year} — ${hhmm} UTC`
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const sector = searchParams.get('sector') ?? 'ssa'
  const band   = searchParams.get('band')   ?? 'GEOCOLOR'
  const count  = Math.min(parseInt(searchParams.get('count') ?? '24', 10), 240)
  const res    = (searchParams.get('res') ?? '600') as Resolution

  const cdnDir = `${CDN_BASE}/${SAT}/ABI/SECTOR/${sector}/${band}/`
  const latestUrl = `${cdnDir}${res}x${res}.jpg`
  const gifUrl    = `${cdnDir}${res}x${res}.gif`

  try {
    // Fetch directory index
    const indexRes = await fetch(cdnDir, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; space-weather-app/0.1)',
        'Referer': 'https://www.star.nesdis.noaa.gov/',
        Accept: 'text/html',
      },
      next: { revalidate: 60 },
    })

    if (!indexRes.ok) {
      // CDN listing blocked or unavailable — fall back to timestamp generation
      return NextResponse.json<ImageryListResponse>(
        buildFallbackResponse(sector, band, count, res, cdnDir, latestUrl, gifUrl),
        { headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' } }
      )
    }

    const html = await indexRes.text()

    // Parse filenames like: 20261160845_GOES19-ABI-ssa-GEOCOLOR-600x600.jpg
    const pattern = new RegExp(
      `(\\d{11})_${SAT}-ABI-${sector}-${band}-${res}x${res}\\.jpg`,
      'g'
    )

    const found: { ts: string; filename: string }[] = []
    let m: RegExpExecArray | null
    while ((m = pattern.exec(html)) !== null) {
      found.push({ ts: m[1], filename: m[0] })
    }

    // Sort descending (newest first), take `count` items, reverse to chronological
    const sorted = found
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, count)
      .reverse()

    const frames: ImageFrame[] = sorted.map(({ ts, filename }) => ({
      url: `${cdnDir}${filename}`,   // raw CDN url — client will proxy via img-proxy
      timestamp: parseNOAATimestamp(ts)?.toISOString() ?? ts,
      label: formatLabel(ts),
      filename,
    }))

    return NextResponse.json<ImageryListResponse>(
      { frames, latestUrl, gifUrl, cdnDir, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' } }
    )
  } catch (err) {
    console.error('[imagery-list]', err)
    return NextResponse.json<ImageryListResponse>(
      buildFallbackResponse(sector, band, count, res, cdnDir, latestUrl, gifUrl),
      { headers: { 'Cache-Control': 'public, max-age=30' } }
    )
  }
}

// ── Fallback: generate timestamps from now backwards at 10-min intervals ──
function buildFallbackResponse(
  sector: string, band: string, count: number, res: Resolution,
  cdnDir: string, latestUrl: string, gifUrl: string
): ImageryListResponse {
  const frames: ImageFrame[] = []
  const now = new Date()
  // Round down to nearest 10 min
  now.setUTCMinutes(Math.floor(now.getUTCMinutes() / 10) * 10, 0, 0)

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 10 * 60 * 1000)
    const ts = buildNOAATimestamp(d)
    const filename = `${ts}_GOES19-ABI-${sector}-${band}-${res}x${res}.jpg`
    frames.push({
      url: `${cdnDir}${filename}`,
      timestamp: d.toISOString(),
      label: formatLabel(ts),
      filename,
    })
  }

  return { frames, latestUrl, gifUrl, cdnDir, fetchedAt: new Date().toISOString() }
}

// Build NOAA timestamp string from Date: YYYYDDDHHMM
function buildNOAATimestamp(d: Date): string {
  const year = d.getUTCFullYear()
  const start = Date.UTC(year, 0, 0)
  const doy = Math.floor((d.getTime() - start) / 86400000)
  return (
    year.toString() +
    doy.toString().padStart(3, '0') +
    d.getUTCHours().toString().padStart(2, '0') +
    d.getUTCMinutes().toString().padStart(2, '0')
  )
}
