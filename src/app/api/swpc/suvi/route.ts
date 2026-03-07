import { NextRequest, NextResponse } from 'next/server'

const WAVELENGTH_URLS: Record<string, string> = {
  '094': 'https://services.swpc.noaa.gov/products/animations/suvi-primary-094.json',
  '131': 'https://services.swpc.noaa.gov/products/animations/suvi-primary-131.json',
  '171': 'https://services.swpc.noaa.gov/products/animations/suvi-primary-171.json',
  '195': 'https://services.swpc.noaa.gov/products/animations/suvi-primary-195.json',
  '284': 'https://services.swpc.noaa.gov/products/animations/suvi-primary-284.json',
  '304': 'https://services.swpc.noaa.gov/products/animations/suvi-primary-304.json',
}

export async function GET(req: NextRequest) {
  const wavelength = req.nextUrl.searchParams.get('wavelength') ?? '171'
  const url = WAVELENGTH_URLS[wavelength] ?? WAVELENGTH_URLS['171']
  try {
    const res = await fetch(url, { next: { revalidate: 280 }, headers: { 'User-Agent': 'space-weather-app/0.1' } })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=280, s-maxage=300', 'X-Data-Source': url } })
  } catch (err) {
    console.error('[API/suvi]', err)
    return NextResponse.json({ error: 'Failed to fetch SUVI frames' }, { status: 500 })
  }
}
