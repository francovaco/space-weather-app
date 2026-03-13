import { NextResponse } from 'next/server'
import { SWPC_ENDPOINTS } from '@/lib/swpc-api'

export async function GET() {
  try {
    const res = await fetch(SWPC_ENDPOINTS.aurora, {
      next: { revalidate: 300 }, // 5-minute cache
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
    })
  } catch (err) {
    console.error('[API/aurora/latest]', err)
    return NextResponse.json({ error: 'Failed to fetch latest aurora data' }, { status: 500 })
  }
}
