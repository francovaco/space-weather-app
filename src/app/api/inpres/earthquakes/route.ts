// ============================================================
// src/app/api/inpres/earthquakes/route.ts
// Proxy del feed XML de sismos INPRES Argentina
// https://www.inpres.gob.ar/mapa/sismos.xml
// ============================================================
import { NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'

const INPRES_XML = 'https://www.inpres.gob.ar/mapa/sismos.xml'

export interface InpresEarthquake {
  id: string
  fecha: string       // DD/MM
  hora: string        // HH:MM (hora Argentina UTC-3)
  lat: number
  lon: number
  depth: number       // km
  mag: number
  province: string
  reviewed: boolean   // false = automatic (color 00f), true = reviewed (000 or f00)
  significant: boolean // color_link === 'f00'
}

let cache: { data: InpresEarthquake[]; expiresAt: number } | null = null

function parseXml(xml: string): InpresEarthquake[] {
  const items: InpresEarthquake[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  const tagRegex = (tag: string) => new RegExp(`<${tag}>([^<]*)<\/${tag}>`)

  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const get = (tag: string) => tagRegex(tag).exec(block)?.[1]?.trim() ?? ''

    const colorLink = get('color_link')
    items.push({
      id: get('idSismo'),
      fecha: get('fecha'),
      hora: get('hora'),
      lat: parseFloat(get('latitud')),
      lon: parseFloat(get('longitud')),
      depth: parseInt(get('prof'), 10),
      mag: parseFloat(get('mg')),
      province: get('prov'),
      reviewed: colorLink !== '00f',
      significant: colorLink === 'f00',
    })
  }
  return items
}

export async function GET() {
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, max-age=290, s-maxage=300' },
    })
  }

  try {
    const res = await instrumentedFetch(INPRES_XML, { cache: 'no-store' }, 'inpres/earthquakes')
    if (!res.ok) throw new Error(`INPRES HTTP ${res.status}`)
    const xml = await res.text()
    const data = parseXml(xml)
    cache = { data, expiresAt: Date.now() + 5 * 60 * 1000 }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=290, s-maxage=300',
        'X-Data-Source': 'INPRES',
        'X-Last-Fetched': new Date().toISOString(),
      },
    })
  } catch (err) {
    logger.error('Failed to fetch INPRES earthquake data', { route: 'inpres/earthquakes', url: INPRES_XML, err })
    return NextResponse.json({ error: 'Error al cargar datos INPRES' }, { status: 500 })
  }
}
