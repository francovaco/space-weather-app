// ============================================================
// src/app/api/goes/status/route.ts
// ============================================================
import { NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const STATUS_URL = 'https://www.ospo.noaa.gov/operations/goes/status.html'

export interface ParsedAnomaly {
  title: string
  href: string
  date: string
  satellite: string
  type: 'outage' | 'degradation' | 'correction' | 'update' | 'info'
}

export interface SatelliteStatusRow {
  name: string
  role: string
  color: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLUE' | 'UNKNOWN'
}

export interface GOESStatusResponse {
  fetchedAt: string
  satellites: SatelliteStatusRow[]
  anomalies: ParsedAnomaly[]
  sourceUrl: string
  parseError?: string
}

function parseColor(raw: string): SatelliteStatusRow['color'] {
  const u = raw.toUpperCase()
  if (u.includes('GREEN'))  return 'GREEN'
  if (u.includes('YELLOW')) return 'YELLOW'
  if (u.includes('ORANGE')) return 'ORANGE'
  if (u.includes('RED'))    return 'RED'
  if (u.includes('BLUE'))   return 'BLUE'
  return 'UNKNOWN'
}

function parseAnomalyType(title: string): ParsedAnomaly['type'] {
  const t = title.toLowerCase()
  if (t.includes('correction')) return 'correction'
  if (t.includes('update'))     return 'update'
  if (t.includes('degradation'))return 'degradation'
  if (t.includes('outage'))     return 'outage'
  return 'info'
}

function parseSatelliteFromTitle(title: string): string {
  const match = title.match(/GOES-\d+/i)
  return match ? match[0].toUpperCase() : 'GOES'
}

function parseDateFromTitle(title: string): string {
  const match = title.match(
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\s+\d{4}Z/i
  )
  return match ? match[0] : ''
}

function parseHTML(html: string): Omit<GOESStatusResponse, 'fetchedAt' | 'sourceUrl'> {
  const anomalies: ParsedAnomaly[] = []
  const linkRegex = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1]
    const rawText = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (!rawText.match(/Product Anomaly|Outage|Degradation/i)) continue
    if (!href.includes('/data/messages/')) continue

    const fullHref = href.startsWith('http')
      ? href : `https://www.ospo.noaa.gov${href}`

    anomalies.push({
      title: rawText,
      href: fullHref,
      date: parseDateFromTitle(rawText),
      satellite: parseSatelliteFromTitle(rawText),
      type: parseAnomalyType(rawText),
    })
  }

  const satellites: SatelliteStatusRow[] = []
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  while ((match = rowRegex.exec(html)) !== null) {
    const cells = match[1]
      .split(/<td[^>]*>/)
      .slice(1)
      .map((c) => c.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)

    if (cells.length >= 2 && cells[0]?.match(/GOES-\d+/i)) {
      const name = cells[0].match(/GOES-\d+/i)?.[0] ?? cells[0]
      const role = cells[1] ?? ''
      const colorRaw = cells[2] ?? cells[1] ?? ''
      satellites.push({ name, role, color: parseColor(colorRaw) })
    }
  }

  return { satellites, anomalies }
}

export async function GET() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await instrumentedFetch(STATUS_URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'space-weather-app/0.1', Accept: 'text/html' },
    }, 'goes/status')

    if (!res.ok) {
      return NextResponse.json<GOESStatusResponse>({
        fetchedAt: new Date().toISOString(), sourceUrl: STATUS_URL,
        satellites: [], anomalies: [],
        parseError: `HTTP ${res.status}`,
      }, { status: 502 })
    }

    const html = await res.text()
    const parsed = parseHTML(html)

    return NextResponse.json<GOESStatusResponse>(
      { fetchedAt: new Date().toISOString(), sourceUrl: STATUS_URL, ...parsed },
      { headers: { 'Cache-Control': 'public, max-age=280, s-maxage=300' } }
    )
  } catch (err) {
    logger.error('Failed to fetch GOES status', { route: 'goes/status', url: STATUS_URL, err })
    return NextResponse.json<GOESStatusResponse>({
      fetchedAt: new Date().toISOString(), sourceUrl: STATUS_URL,
      satellites: [], anomalies: [],
      parseError: 'Error al obtener el estado del satélite',
    }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
