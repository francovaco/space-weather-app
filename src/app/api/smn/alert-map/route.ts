// ============================================================
// src/app/api/smn/alert-map/route.ts
// Devuelve un GeoJSON FeatureCollection con las 171 zonas SMN
// y sus niveles de alerta actuales — para renderizar con MapLibre
// ============================================================
import { NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const SMN_HTML = 'https://ws2.smn.gob.ar/alertas'
const SMN_API  = 'https://ws1.smn.gob.ar/v1'

// Shared in-memory caches (same instance as /api/smn/alerts)
let jwtCache: { token: string; expiresAt: number } | null = null
let geoCache: { data: GeoJSON.FeatureCollection; expiresAt: number } | null = null
let alertsRawCache: { data: AreaAlert[]; expiresAt: number } | null = null

interface AreaAlert {
  area_id: number
  updated: string
  warnings: { date: string; max_level: number; events: { id: number; max_level: number }[] }[]
}

const EVENT_NAMES: Record<number, string> = {
  37: 'Lluvia', 39: 'Viento', 40: 'Fenómeno local',
  41: 'Tormenta', 42: 'Nevada', 45: 'Tornado',
  46: 'Granizo', 47: 'Viento Zonda', 54: 'Niebla',
}

async function getJwt(): Promise<string> {
  if (jwtCache && Date.now() < jwtCache.expiresAt) return jwtCache.token
  const html = await instrumentedFetch(SMN_HTML, { cache: 'no-store' }, 'smn/alert-map').then(r => r.text())
  const m = html.match(/localStorage\.setItem\('token',\s*'([^']+)'\)/)
  if (!m) throw new Error('SMN JWT not found')
  jwtCache = { token: m[1], expiresAt: Date.now() + 50 * 60 * 1000 }
  return jwtCache.token
}

async function getAlerts(jwt: string): Promise<AreaAlert[]> {
  if (alertsRawCache && Date.now() < alertsRawCache.expiresAt) return alertsRawCache.data
  const res = await instrumentedFetch(`${SMN_API}/warning/alert/area?mode=alert&compact=true`, {
    headers: { Authorization: `JWT ${jwt}` },
    cache: 'no-store',
  }, 'smn/alert-map')
  if (!res.ok) throw new Error(`SMN alerts error: ${res.status}`)
  const data: AreaAlert[] = await res.json()
  alertsRawCache = { data, expiresAt: Date.now() + 30 * 60 * 1000 }
  return data
}

async function getGeoJSON(jwt: string, alerts: AreaAlert[]): Promise<GeoJSON.FeatureCollection> {
  // Re-build cache if stale (geo changes every 24h, but alerts change — rebuild together)
  if (geoCache && Date.now() < geoCache.expiresAt) {
    // Patch properties with fresh alert data instead of re-fetching geometry
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
    const alertMap = new Map(alerts.map(a => {
      const todayW = a.warnings.find(w => w.date === today)
      const maxLevel = todayW?.max_level ?? 1
      const events = (todayW?.events ?? [])
        .filter(e => e.max_level >= 3)
        .map(e => EVENT_NAMES[e.id] ?? `Evento ${e.id}`)
      return [a.area_id, { maxLevel, events, updated: a.updated }]
    }))
    const patched: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: geoCache.data.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          ...(alertMap.get(f.properties?.area_id) ?? { maxLevel: 1, events: [], updated: null }),
        },
      })),
    }
    return patched
  }

  // Full rebuild
  const res = await instrumentedFetch(`${SMN_API}/georef/area?show_geometry=true`, {
    headers: { Authorization: `JWT ${jwt}` },
    cache: 'no-store',
  }, 'smn/alert-map')
  if (!res.ok) throw new Error(`SMN georef error: ${res.status}`)
  const areas = await res.json()

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
  const alertMap = new Map(alerts.map(a => {
    const todayW = a.warnings.find(w => w.date === today)
    const maxLevel = todayW?.max_level ?? 1
    const events = (todayW?.events ?? [])
      .filter(e => e.max_level >= 3)
      .map(e => EVENT_NAMES[e.id] ?? `Evento ${e.id}`)
    return [a.area_id, { maxLevel, events, updated: a.updated }]
  }))

  const fc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: areas.map((area: any) => ({
      type: 'Feature',
      geometry: area.geometry,
      properties: {
        area_id: area.id,
        area_name: area.name,
        provinces: area.provinces?.map((p: any) => p.name).join(', ') ?? '',
        ...(alertMap.get(area.id) ?? { maxLevel: 1, events: [], updated: null }),
      },
    })),
  }

  geoCache = { data: fc, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }
  return fc
}

export async function GET() {
  try {
    const jwt = await getJwt()
    const [alerts, geojson] = await Promise.all([
      getAlerts(jwt),
      // Pass empty alerts to trigger geometry load first, then patch
      Promise.resolve(null as GeoJSON.FeatureCollection | null),
    ])
    const fc = await getGeoJSON(jwt, alerts)

    return NextResponse.json(fc, {
      headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
    })
  } catch (err) {
    logger.error('Failed to fetch SMN alert map', { route: 'smn/alert-map', err })
    return NextResponse.json({ error: 'Error al cargar mapa SMN' }, { status: 500 })
  }
}
