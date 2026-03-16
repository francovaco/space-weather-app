// ============================================================
// src/app/api/geo/world-borders/route.ts
// Extrae los anillos de coordenadas de los países del mundo
// desde Natural Earth 110m (GeoJSON, dominio público)
// Cachea 24h — los bordes no cambian
// ============================================================
import { NextResponse } from 'next/server'

const SOURCE_URL =
  'https://cdn.jsdelivr.net/gh/holtzy/D3-graph-gallery@master/DATA/world.geojson'

type Coord = [number, number]
type Ring = Coord[]

export async function GET() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'space-weather-app/0.1' },
      next: { revalidate: 86400 },
    })

    if (!res.ok)
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const geojson = await res.json()
    const rings: Ring[] = []

    for (const feature of geojson.features ?? []) {
      const geom = feature.geometry
      if (!geom) continue

      if (geom.type === 'Polygon') {
        for (const ring of geom.coordinates as Coord[][]) rings.push(ring)
      } else if (geom.type === 'MultiPolygon') {
        for (const polygon of geom.coordinates as Coord[][][])
          for (const ring of polygon) rings.push(ring)
      }
    }

    return NextResponse.json(
      { rings },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          'X-Data-Source': SOURCE_URL,
        },
      },
    )
  } catch (err) {
    console.error('[API/geo/world-borders]', err)
    return NextResponse.json({ error: 'Failed to fetch world borders' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
