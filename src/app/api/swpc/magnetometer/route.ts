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
  const { searchParams } = req.nextUrl
  const range = searchParams.get('range') ?? '1-day'
  const dateParam = searchParams.get('date') // YYYY-MM-DD
  
  let url = RANGE_MAP[range] ?? SWPC_ENDPOINTS.magnetometer1d
  
  if (dateParam) {
    const targetDate = new Date(dateParam)
    const now = new Date()
    const diffDays = (now.getTime() - targetDate.getTime()) / (1000 * 3600 * 24)
    
    if (diffDays <= 7) {
      // Within 7 days, we can use the 7-day JSON and filter on the client
      url = SWPC_ENDPOINTS.magnetometer7d
    } else {
      // Beyond 7 days, NOAA doesn't provide JSON archives for magnetometers
      return NextResponse.json({ 
        error: 'Datos históricos limitados', 
        message: 'Los datos JSON del magnetómetro solo están disponibles para los últimos 7 días en los servidores de la NOAA.' 
      }, { status: 404 })
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
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
    console.error('[API/magnetometer]', url, err)
    return NextResponse.json({ error: 'Failed to fetch magnetometer data' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
