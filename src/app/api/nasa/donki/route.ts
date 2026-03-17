// ============================================================
// src/app/api/nasa/donki/route.ts
// Proxies NASA DONKI Space Weather Notifications
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY'
const USING_DEMO_KEY = !process.env.NASA_API_KEY
const DONKI_BASE = 'https://api.nasa.gov/DONKI/notifications'

if (USING_DEMO_KEY) {
  logger.warn('NASA_API_KEY not configured — using DEMO_KEY (30 req/hour limit)', { route: 'nasa/donki' })
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const type = searchParams.get('type') || 'all'

  // Default to last 30 days if no range provided
  const now = new Date()
  const defaultEnd = now.toISOString().split('T')[0]
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const url = `${DONKI_BASE}?startDate=${startDate || defaultStart}&endDate=${endDate || defaultEnd}&type=${type}&api_key=${NASA_API_KEY}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await instrumentedFetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }, 'nasa/donki')

    if (!res.ok) {
      logger.warn('NASA DONKI upstream error', { route: 'nasa/donki', url, status: res.status })
      return NextResponse.json({ error: 'Upstream error (NASA DONKI)', status: res.status }, { status: 502 })
    }

    const data = await res.json()
    
    // Filter for notifications that mention spacecraft impact or anomalies if possible
    // or just return all and let the client filter
    const responseHeaders: Record<string, string> = {
      'Cache-Control': 'public, max-age=300, s-maxage=600',
      'X-Data-Source': 'NASA DONKI',
    }
    if (USING_DEMO_KEY) responseHeaders['X-Rate-Limit-Warning'] = 'DEMO_KEY active — 30 req/hour limit'

    return NextResponse.json(data, { headers: responseHeaders })
  } catch (err) {
    logger.error('Failed to fetch NASA DONKI data', { route: 'nasa/donki', url, err })
    return NextResponse.json({ error: 'Failed to fetch NASA DONKI data' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
