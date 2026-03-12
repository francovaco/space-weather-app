import { NextRequest, NextResponse } from 'next/server'

// Haversine formula to calculate distance between two points in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = parseFloat(searchParams.get('lat') || '')
  const lon = parseFloat(searchParams.get('lon') || '')

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ strikes: [], count: 0, error: 'Invalid coordinates' }, { status: 400 })
  }

  try {
    // Define a bounding box (~1 degree ≈ 111km)
    const minLat = lat - 1.5
    const maxLat = lat + 1.5
    const minLon = lon - 1.5
    const maxLon = lon + 1.5

    const NOAA_BASE = process.env.NEXT_PUBLIC_NOAA_NOWCOAST || 'https://nowcoast.noaa.gov'

    // NOAA NOWCOAST real-time lightning strikes (last 1 hour)
    // Using spatial query for the bounding box
    const noaaUrl = `${NOAA_BASE}/arcgis/rest/services/nowcoast/sat_meteo_em_lightning_strikes_1hr_time/MapServer/0/query?f=json&where=1%3D1&geometry=${minLon},${minLat},${maxLon},${maxLat}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true`

    const response = await fetch(noaaUrl, { next: { revalidate: 60 } })
    if (!response.ok) throw new Error('NOAA API error')
    
    const data = await response.json()
    
    interface Strike {
      lat: number
      lon: number
      distance: number
      time: number
    }

    const strikes: Strike[] = (data.features || []).map((f: { geometry: { x: number, y: number }, attributes: { last_strike_time?: number } }) => {
      const sLat = f.geometry.y
      const sLon = f.geometry.x
      const dist = calculateDistance(lat, lon, sLat, sLon)
      return {
        lat: sLat,
        lon: sLon,
        distance: dist,
        time: f.attributes.last_strike_time || Date.now()
      }
    })
    .filter((s: Strike) => s.distance <= 100) // 100km radius
    .sort((a: Strike, b: Strike) => a.distance - b.distance)

    return NextResponse.json({
      count: strikes.length,
      closest: strikes[0]?.distance || null,
      strikes: strikes.slice(0, 10), // Return top 10 closest
      status: 'online'
    })

  } catch (err) {
    console.error('Lightning API Error:', err)
    return NextResponse.json({ count: 0, closest: null, strikes: [], status: 'offline' })
  }
}
