// ============================================================
// src/app/api/smn/alerts/route.ts
// SMN Argentina — Sistema de Alerta Temprana
// Obtiene el JWT embebido en el HTML, busca el área por lat/lon
// usando point-in-polygon sobre las 171 zonas, y devuelve las
// alertas vigentes para esa zona.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

const SMN_HTML = 'https://ws2.smn.gob.ar/alertas'
const SMN_API  = 'https://ws1.smn.gob.ar/v1'

// ── In-memory caches (persisten por instancia de servidor) ────
let jwtCache: { token: string; expiresAt: number } | null = null
let areasCache: { data: SmnArea[]; expiresAt: number } | null = null
let alertsCache: { data: SmnAreaAlert[]; expiresAt: number } | null = null

// ── Types ─────────────────────────────────────────────────────

interface GeoMultiPolygon {
  type: 'MultiPolygon'
  coordinates: number[][][][]  // [polygon][ring][point][lon,lat]
}

interface SmnArea {
  id: number
  name: string
  provinces: { id: number; name: string }[]
  geometry: GeoMultiPolygon
}

interface SmnAreaAlert {
  area_id: number
  updated: string
  warnings: {
    date: string
    max_level: number
    events: { id: number; max_level: number }[]
  }[]
}

// ── Event & level maps ────────────────────────────────────────

const EVENT_NAMES: Record<number, string> = {
  37: 'Lluvia',
  39: 'Viento',
  40: 'Fenómeno local',
  41: 'Tormenta',
  42: 'Nevada',
  45: 'Tornado',
  46: 'Granizo',
  47: 'Viento Zonda',
  54: 'Niebla',
}

const LEVEL: Record<number, { label: string; color: 'yellow' | 'orange' | 'red' }> = {
  3: { label: 'Amarillo', color: 'yellow' },
  4: { label: 'Naranja',  color: 'orange' },
  5: { label: 'Rojo',     color: 'red'    },
}

// ── JWT ───────────────────────────────────────────────────────

async function getJwt(): Promise<string> {
  if (jwtCache && Date.now() < jwtCache.expiresAt) return jwtCache.token

  const html = await fetch(SMN_HTML, { cache: 'no-store' }).then((r) => r.text())
  const m = html.match(/localStorage\.setItem\('token',\s*'([^']+)'\)/)
  if (!m) throw new Error('SMN JWT not found in page HTML')

  jwtCache = { token: m[1], expiresAt: Date.now() + 50 * 60 * 1000 } // 50 min
  return jwtCache.token
}

// ── Data fetchers ─────────────────────────────────────────────

async function getAreas(jwt: string): Promise<SmnArea[]> {
  if (areasCache && Date.now() < areasCache.expiresAt) return areasCache.data

  const res = await fetch(`${SMN_API}/georef/area?show_geometry=true`, {
    headers: { Authorization: `JWT ${jwt}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`SMN georef error: ${res.status}`)
  const data: SmnArea[] = await res.json()

  areasCache = { data, expiresAt: Date.now() + 24 * 60 * 60 * 1000 } // 24 h
  return data
}

async function getAlerts(jwt: string): Promise<SmnAreaAlert[]> {
  if (alertsCache && Date.now() < alertsCache.expiresAt) return alertsCache.data

  const res = await fetch(`${SMN_API}/warning/alert/area?mode=alert&compact=true`, {
    headers: { Authorization: `JWT ${jwt}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`SMN alerts error: ${res.status}`)
  const data: SmnAreaAlert[] = await res.json()

  alertsCache = { data, expiresAt: Date.now() + 30 * 60 * 1000 } // 30 min
  return data
}

// ── Point-in-polygon (ray-casting) ────────────────────────────

function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointInMultiPolygon(lon: number, lat: number, geom: GeoMultiPolygon): boolean {
  for (const polygon of geom.coordinates) {
    // polygon[0] = exterior ring, polygon[1..] = holes
    if (pointInRing(lon, lat, polygon[0])) {
      const inHole = polygon.slice(1).some((hole) => pointInRing(lon, lat, hole))
      if (!inHole) return true
    }
  }
  return false
}

// ── Handler ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') ?? '')
  const lon = parseFloat(req.nextUrl.searchParams.get('lon') ?? '')

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'lat y lon son requeridos' }, { status: 400 })
  }

  try {
    const jwt = await getJwt()
    const [areas, alerts] = await Promise.all([getAreas(jwt), getAlerts(jwt)])

    // Find the area that contains this lat/lon
    const matched = areas.find((a) => pointInMultiPolygon(lon, lat, a.geometry))

    if (!matched) {
      // Punto fuera de las áreas SMN (e.g. fuera de Argentina)
      return NextResponse.json(
        { area_id: null, area_name: null, alerts: [], updated: null },
        { headers: { 'Cache-Control': 'public, max-age=1800' } },
      )
    }

    const areaAlert = alerts.find((a) => a.area_id === matched.id)
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
    const todayWarnings = areaAlert?.warnings.find((w) => w.date === today)

    const activeAlerts = (todayWarnings?.events ?? [])
      .filter((e) => e.max_level >= 3)
      .map((e) => ({
        event_id: e.id,
        event_name: EVENT_NAMES[e.id] ?? `Evento ${e.id}`,
        level: e.max_level,
        level_label: LEVEL[e.max_level]?.label ?? 'Alerta',
        level_color: LEVEL[e.max_level]?.color ?? 'yellow',
      }))
      .sort((a, b) => b.level - a.level)

    return NextResponse.json(
      {
        area_id: matched.id,
        area_name: matched.name,
        provinces: matched.provinces.map((p) => p.name),
        alerts: activeAlerts,
        updated: areaAlert?.updated ?? null,
      },
      { headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' } },
    )
  } catch (err) {
    console.error('[API/smn/alerts]', err)
    return NextResponse.json({ error: 'Error al consultar SMN' }, { status: 500 })
  }
}
