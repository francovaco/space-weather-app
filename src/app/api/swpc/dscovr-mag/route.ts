// ============================================================
// src/app/api/swpc/dscovr-mag/route.ts
// Proxies SWPC DSCOVR IMF (Magnetometer at L1) JSON
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { SWPC_ENDPOINTS } from '@/lib/swpc-api'
import { validateData, DSCOVRMagDataSchema } from '@/lib/schemas'

const RANGE_MAP: Record<string, string> = {
  '1-hour': SWPC_ENDPOINTS.dscovrMag1h,
  '6-hour': SWPC_ENDPOINTS.dscovrMag6h,
  '1-day': SWPC_ENDPOINTS.dscovrMag1d,
  '3-day': SWPC_ENDPOINTS.dscovrMag3d,
  '7-day': SWPC_ENDPOINTS.dscovrMag7d,
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const range = searchParams.get('range') ?? '1-day'
  
  const url = RANGE_MAP[range] ?? SWPC_ENDPOINTS.dscovrMag1d

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'space-weather-app/0.1', 'Accept-Encoding': 'identity' },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream error', status: res.status }, { status: 502 })
    }

    const raw = await res.json()
    if (!Array.isArray(raw) || raw.length < 2) return NextResponse.json([])

    // Map to objects: ["time_tag", "bx", "by", "bz", "bt", "lat", "lon"]
    // Some endpoints might return more/less columns, but mag usually has 7
    const mapped = raw.slice(1).map((row: any[]) => ({
      time_tag: row[0],
      bx: parseFloat(row[1]),
      by: parseFloat(row[2]),
      bz: parseFloat(row[3]),
      bt: parseFloat(row[4]),
      lat: parseFloat(row[5]),
      lon: parseFloat(row[6]),
    })).filter((d: { bt: number }) => !isNaN(d.bt))

    const validated = validateData(DSCOVRMagDataSchema, mapped, 'dscovr-mag')
    if (!validated.ok) return validated.response

    return NextResponse.json(validated.data, {
      headers: {
        'Cache-Control': 'public, max-age=55, s-maxage=60',
        'X-Data-Source': url,
        'X-Last-Fetched': new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[API/dscovr-mag]', url, err)
    return NextResponse.json({ error: 'Failed to fetch DSCOVR magnetometer data' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
