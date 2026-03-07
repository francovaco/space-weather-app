// ============================================================
// src/app/api/swpc/magnetometer/route.ts
// Proxies SWPC magnetometer JSON — avoids CORS issues
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { SWPC_ENDPOINTS } from '@/lib/swpc-api'

const RANGE_MAP: Record<string, string> = {
  '1-hour': SWPC_ENDPOINTS.magnetometer1h,
  '6-hour': SWPC_ENDPOINTS.magnetometer6h,
  '1-day': SWPC_ENDPOINTS.magnetometer1d,
  '3-day': SWPC_ENDPOINTS.magnetometer3d,
  '7-day': SWPC_ENDPOINTS.magnetometer7d,
}

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') ?? '1-day'
  const url = RANGE_MAP[range] ?? SWPC_ENDPOINTS.magnetometer1d

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 }, // 1-minute server-side cache
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream error', status: res.status }, { status: 502 })
    }

    const data = await res.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=55, s-maxage=60',
        'X-Data-Source': url,
        'X-Last-Fetched': new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[API/magnetometer]', err)
    return NextResponse.json({ error: 'Failed to fetch magnetometer data' }, { status: 500 })
  }
}
