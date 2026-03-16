import { NextRequest, NextResponse } from 'next/server'
import { SWPC_ENDPOINTS } from '@/lib/swpc-api'

const RANGE_MAP: Record<string, string> = {
  '1-hour': SWPC_ENDPOINTS.xray1h,
  '6-hour': SWPC_ENDPOINTS.xray6h,
  '1-day': SWPC_ENDPOINTS.xray1d,
  '3-day': SWPC_ENDPOINTS.xray3d,
  '7-day': SWPC_ENDPOINTS.xray7d,
}

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') ?? '1-day'
  const url = RANGE_MAP[range] ?? SWPC_ENDPOINTS.xray1d
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store',headers: { 'User-Agent': 'space-weather-app/0.1' } })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60', 'X-Data-Source': url } })
  } catch (err) {
    console.error('[API/xray-flux]', url, err)
    return NextResponse.json({ error: 'Failed to fetch X-ray data' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
