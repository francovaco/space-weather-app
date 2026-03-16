import { NextResponse } from 'next/server'

const URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json'

export async function GET() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    
    const raw = await res.json()
    if (!Array.isArray(raw) || raw.length < 2) return NextResponse.json([])

    // Map to objects: ["time_tag", "density", "speed", "temperature"]
    const data = raw.slice(1).map(row => ({
      time_tag: row[0],
      density: parseFloat(row[1]),
      speed: parseFloat(row[2]),
      temperature: parseFloat(row[3])
    })).filter(d => !isNaN(d.density) && !isNaN(d.speed))

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=240, s-maxage=300' },
    })
  } catch (err) {
    console.error('[API/solar-wind-plasma]', URL, err)
    return NextResponse.json({ error: 'Failed to fetch solar wind plasma' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
