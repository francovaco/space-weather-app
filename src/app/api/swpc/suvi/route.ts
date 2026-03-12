import { NextRequest, NextResponse } from 'next/server'

const SWPC_BASE = 'https://services.swpc.noaa.gov'

const WAVELENGTH_URLS: Record<string, string> = {
  '094': `${SWPC_BASE}/products/animations/suvi-primary-094.json`,
  '131': `${SWPC_BASE}/products/animations/suvi-primary-131.json`,
  '171': `${SWPC_BASE}/products/animations/suvi-primary-171.json`,
  '195': `${SWPC_BASE}/products/animations/suvi-primary-195.json`,
  '284': `${SWPC_BASE}/products/animations/suvi-primary-284.json`,
  '304': `${SWPC_BASE}/products/animations/suvi-primary-304.json`,
}

/** Extract timestamp from SUVI filename: ...s20260307T162400Z_e... → ISO string */
function parseTimestampFromUrl(url: string): string {
  const match = url.match(/_s(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/)
  if (!match) return new Date().toISOString()
  const [, y, mo, d, h, mi, se] = match
  return `${y}-${mo}-${d}T${h}:${mi}:${se}Z`
}

interface RawFrame { url: string }

export async function GET(req: NextRequest) {
  const wavelength = req.nextUrl.searchParams.get('wavelength') ?? '171'
  const url = WAVELENGTH_URLS[wavelength] ?? WAVELENGTH_URLS['171']
  try {
    const res = await fetch(url, { next: { revalidate: 280 }, headers: { 'User-Agent': 'space-weather-app/0.1' } })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const raw: RawFrame[] = await res.json()

    const frames = raw.map((f) => {
      let fullUrl = f.url
      if (!fullUrl.startsWith('http')) {
        const path = f.url.startsWith('/') ? f.url : `/${f.url}`
        fullUrl = `${SWPC_BASE}${path}`
      }
      return {
        url: fullUrl,
        time_tag: parseTimestampFromUrl(f.url),
      }
    })

    return NextResponse.json(frames, { headers: { 'Cache-Control': 'public, max-age=280, s-maxage=300', 'X-Data-Source': url } })
  } catch (err) {
    console.error('[API/suvi]', err)
    return NextResponse.json({ error: 'Failed to fetch SUVI frames' }, { status: 500 })
  }
}
