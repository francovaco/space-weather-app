import { NextRequest, NextResponse } from 'next/server'
import { SWPC_ENDPOINTS } from '@/lib/swpc-api'
import { validateData, ProtonFluxDataSchema } from '@/lib/schemas'

const RANGE_MAP: Record<string, string> = {
  '1-hour': SWPC_ENDPOINTS.protons1h,
  '6-hour': SWPC_ENDPOINTS.protons6h,
  '1-day': SWPC_ENDPOINTS.protons1d,
  '3-day': SWPC_ENDPOINTS.protons3d,
  '7-day': SWPC_ENDPOINTS.protons7d,
}

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') ?? '1-day'
  const url = RANGE_MAP[range] ?? SWPC_ENDPOINTS.protons1d
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store',headers: { 'User-Agent': 'space-weather-app/0.1' } })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const raw = await res.json()
    const validated = validateData(ProtonFluxDataSchema, raw, 'proton-flux')
    if (!validated.ok) return validated.response
    return NextResponse.json(validated.data, { headers: { 'Cache-Control': 'public, max-age=280, s-maxage=300', 'X-Data-Source': url } })
  } catch (err) {
    console.error('[API/proton-flux]', url, err)
    return NextResponse.json({ error: 'Failed to fetch proton flux data' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
