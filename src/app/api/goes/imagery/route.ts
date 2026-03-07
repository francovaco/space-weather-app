// ============================================================
// src/app/api/goes/imagery/route.ts
// Returns list of available ABI image timestamps for a band/sector
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

/**
 * NESDIS CDN image listing.
 * The CDN doesn't provide a proper JSON listing API, so we build
 * timestamps based on the known 10-minute update schedule.
 * In production, this could be enhanced by scraping the CDN directory listing.
 */
export async function GET(req: NextRequest) {
  const band = req.nextUrl.searchParams.get('band') ?? '13'
  const sector = req.nextUrl.searchParams.get('sector') ?? 'SSA'
  const count = parseInt(req.nextUrl.searchParams.get('count') ?? '24', 10)
  const resolution = req.nextUrl.searchParams.get('resolution') ?? '678'

  // Build timestamps: last `count` frames, 10-min intervals
  const frames = buildFrameList(band, sector, resolution, Math.min(count, 240))

  return NextResponse.json(
    { band, sector, resolution, count: frames.length, frames },
    { headers: { 'Cache-Control': 'public, max-age=580, s-maxage=600' } }
  )
}

interface FrameEntry {
  url: string
  timestamp: string
}

function buildFrameList(
  band: string,
  sector: string,
  resolution: string,
  count: number
): FrameEntry[] {
  const CDN = 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI'
  const now = new Date()
  // Round down to nearest 10 min and subtract 20 min buffer for processing delay
  const latest = new Date(now)
  latest.setMinutes(Math.floor(latest.getMinutes() / 10) * 10 - 20, 0, 0)

  const frames: FrameEntry[] = []

  for (let i = count - 1; i >= 0; i--) {
    const ts = new Date(latest.getTime() - i * 10 * 60 * 1000)

    // Format: YYYYDDDHHMMSS (Julian day format used by NESDIS)
    const year = ts.getUTCFullYear()
    const doy = getDayOfYear(ts)
    const hh = String(ts.getUTCHours()).padStart(2, '0')
    const mm = String(ts.getUTCMinutes()).padStart(2, '0')
    const paddedBand = band.padStart(2, '0')

    let url: string
    if (sector === 'FD') {
      url = `${CDN}/FD/${paddedBand}/${year}${doy}${hh}${mm}00_${resolution}.jpg`
    } else {
      const sec = sector.toUpperCase()
      url = `${CDN}/SECTOR/${sec}/ABI-${sec}-${paddedBand}/${year}${doy}${hh}${mm}00_${resolution}.jpg`
    }

    frames.push({ url, timestamp: ts.toISOString() })
  }

  return frames
}

function getDayOfYear(date: Date): string {
  const start = new Date(date.getUTCFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  const day = Math.floor(diff / oneDay)
  return String(day).padStart(3, '0')
}
