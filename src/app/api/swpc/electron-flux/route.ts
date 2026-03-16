import { NextRequest, NextResponse } from 'next/server'
import { SWPC_ENDPOINTS } from '@/lib/swpc-api'

const RANGE_MAP: Record<string, string> = {
  '1-hour': SWPC_ENDPOINTS.electrons1h,
  '6-hour': SWPC_ENDPOINTS.electrons6h,
  '1-day': SWPC_ENDPOINTS.electrons1d,
  '3-day': SWPC_ENDPOINTS.electrons3d,
  '7-day': SWPC_ENDPOINTS.electrons7d,
}

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') ?? '1-day'
  const url = RANGE_MAP[range] ?? SWPC_ENDPOINTS.electrons1d
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store',headers: { 'User-Agent': 'space-weather-app/0.1' } })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=280, s-maxage=300', 'X-Data-Source': url } })
  } catch (err) {
    console.error('[API/electron-flux]', url, err)
    return NextResponse.json({ error: 'Failed to fetch electron flux data' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
