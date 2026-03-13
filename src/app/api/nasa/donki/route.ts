// ============================================================
// src/app/api/nasa/donki/route.ts
// Proxies NASA DONKI Space Weather Notifications
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY'
const DONKI_BASE = 'https://api.nasa.gov/DONKI/notifications'

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

  try {
    const res = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 mins
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    if (!res.ok) {
      console.error(`NASA DONKI Error: ${res.status} ${url}`)
      return NextResponse.json({ error: 'Upstream error (NASA DONKI)', status: res.status }, { status: 502 })
    }

    const data = await res.json()
    
    // Filter for notifications that mention spacecraft impact or anomalies if possible
    // or just return all and let the client filter
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        'X-Data-Source': 'NASA DONKI',
      },
    })
  } catch (err) {
    console.error('[API/nasa/donki]', err)
    return NextResponse.json({ error: 'Failed to fetch NASA DONKI data' }, { status: 500 })
  }
}
