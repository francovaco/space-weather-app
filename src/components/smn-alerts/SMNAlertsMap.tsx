'use client'
// ============================================================
// src/components/smn-alerts/SMNAlertsMap.tsx
// Mapa interactivo de alertas SMN Argentina con MapLibre GL
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { AlertTriangle, RefreshCw, MapPin, X, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────

interface AreaProperties {
  area_id: number
  area_name: string
  provinces: string
  maxLevel: number
  events: string[]
  updated: string | null
}

interface PopupInfo {
  area_name: string
  provinces: string
  maxLevel: number
  events: string[]
  updated: string | null
  x: number
  y: number
}

// ── Constants ─────────────────────────────────────────────────

const LEVEL_COLORS: Record<number, string> = {
  1: '#22c55e', // verde
  2: '#22c55e', // verde
  3: '#f59e0b', // amarillo
  4: '#f97316', // naranja
  5: '#ef4444', // rojo
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Sin alerta',
  2: 'Sin alerta',
  3: 'Amarillo',
  4: 'Naranja',
  5: 'Rojo',
}

const LEVEL_TEXT_COLORS: Record<number, string> = {
  3: 'text-amber-400',
  4: 'text-orange-400',
  5: 'text-red-400',
}

// Dark basemap estilo consistente con la app
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap © CARTO',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.8 } }],
}

// ── Component ─────────────────────────────────────────────────

export function SMNAlertsMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [popup, setPopup] = useState<PopupInfo | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [alertCount, setAlertCount] = useState(0)
  const [showNoAlertZones, setShowNoAlertZones] = useState(false)

  const loadData = useCallback(async (map: maplibregl.Map) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/smn/alert-map')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const geojson: GeoJSON.FeatureCollection = await res.json()

      // Count active alerts
      const active = geojson.features.filter(f => (f.properties?.maxLevel ?? 1) >= 3).length
      setAlertCount(active)

      // Find most recent update timestamp
      const dates = geojson.features
        .map(f => f.properties?.updated)
        .filter(Boolean)
        .sort()
      if (dates.length) setLastUpdate(dates[dates.length - 1])

      // Update or add source
      if (map.getSource('smn-alerts')) {
        (map.getSource('smn-alerts') as maplibregl.GeoJSONSource).setData(geojson)
      } else {
        map.addSource('smn-alerts', { type: 'geojson', data: geojson })

        // Fill layer — alert zones colored by level
        map.addLayer({
          id: 'smn-fill',
          type: 'fill',
          source: 'smn-alerts',
          paint: {
            'fill-color': [
              'match', ['get', 'maxLevel'],
              3, LEVEL_COLORS[3],
              4, LEVEL_COLORS[4],
              5, LEVEL_COLORS[5],
              LEVEL_COLORS[1],
            ],
            'fill-opacity': [
              'match', ['get', 'maxLevel'],
              3, 0.45, 4, 0.45, 5, 0.5,
              0.2,
            ],
          },
        })

        // Outline for all zones
        map.addLayer({
          id: 'smn-outline',
          type: 'line',
          source: 'smn-alerts',
          paint: {
            'line-color': [
              'match', ['get', 'maxLevel'],
              3, LEVEL_COLORS[3],
              4, LEVEL_COLORS[4],
              5, LEVEL_COLORS[5],
              LEVEL_COLORS[1],
            ],
            'line-width': [
              'match', ['get', 'maxLevel'],
              3, 1.5, 4, 1.5, 5, 2,
              0.5,
            ],
            'line-opacity': [
              'match', ['get', 'maxLevel'],
              3, 0.9, 4, 0.9, 5, 1,
              0.25,
            ],
          },
        })

        // Hover highlight layer
        map.addLayer({
          id: 'smn-hover',
          type: 'fill',
          source: 'smn-alerts',
          paint: {
            'fill-color': '#ffffff',
            'fill-opacity': [
              'case', ['boolean', ['feature-state', 'hover'], false], 0.12, 0,
            ],
          },
        })

        // Click interaction
        let hoveredId: number | string | undefined
        map.on('mousemove', 'smn-fill', (e) => {
          map.getCanvas().style.cursor = 'pointer'
          if (e.features?.length) {
            if (hoveredId !== undefined) {
              map.setFeatureState({ source: 'smn-alerts', id: hoveredId }, { hover: false })
            }
            hoveredId = e.features[0].id
            map.setFeatureState({ source: 'smn-alerts', id: hoveredId! }, { hover: true })
          }
        })

        map.on('mouseleave', 'smn-fill', () => {
          map.getCanvas().style.cursor = ''
          if (hoveredId !== undefined) {
            map.setFeatureState({ source: 'smn-alerts', id: hoveredId }, { hover: false })
            hoveredId = undefined
          }
          setPopup(null)
        })

        map.on('click', 'smn-fill', (e) => {
          if (!e.features?.length) return
          const props = e.features[0].properties as AreaProperties
          const point = map.project(e.lngLat)
          setPopup({
            area_name: props.area_name,
            provinces: props.provinces,
            maxLevel: props.maxLevel,
            events: typeof props.events === 'string' ? JSON.parse(props.events) : props.events ?? [],
            updated: props.updated,
            x: point.x,
            y: point.y,
          })
        })
      }
    } catch (err) {
      console.error('[SMNAlertsMap]', err)
      setError('No se pudo cargar el mapa de alertas SMN')
    } finally {
      setLoading(false)
    }
  }, [])

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_STYLE,
      center: [-64, -38],   // center of Argentina
      zoom: 4.2,
      minZoom: 3,
      maxZoom: 10,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', () => {
      mapRef.current = map
      loadData(map)

      // Try to show user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude, longitude } = pos.coords
          const el = document.createElement('div')
          el.className = 'w-3 h-3 rounded-full bg-accent-cyan border-2 border-white shadow-lg shadow-cyan-500/50'
          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(map)
        }, () => null, { timeout: 5000 })
      }
    })

    return () => { map.remove(); mapRef.current = null }
  }, [loadData])

  // Toggle no-alert zones visibility
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('smn-outline')) return
    map.setPaintProperty('smn-outline', 'line-opacity', [
      'match', ['get', 'maxLevel'],
      3, 0.9, 4, 0.9, 5, 1,
      showNoAlertZones ? 0.2 : 0,
    ])
  }, [showNoAlertZones])

  const handleRefresh = () => {
    if (mapRef.current) loadData(mapRef.current)
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border">
      {/* Map container */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-4 py-2.5">
            <RefreshCw size={14} className="animate-spin text-accent-cyan" />
            <span className="text-xs text-text-secondary">Cargando alertas SMN…</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Top-left: title + stats */}
      <div className="absolute left-3 top-3 space-y-2 pointer-events-none">
        <div className="rounded-lg border border-border bg-background-secondary/90 px-3 py-2 backdrop-blur-sm">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-text-primary">
            Sistema de Alerta Temprana
          </p>
          <p className="text-2xs text-text-muted">SMN Argentina · {alertCount > 0 ? `${alertCount} zonas con alerta` : 'Sin alertas activas'}</p>
        </div>
      </div>

      {/* Bottom-left: legend + controls */}
      <div className="absolute bottom-8 left-3 space-y-2">
        {/* Legend */}
        <div className="rounded-lg border border-border bg-background-secondary/90 px-3 py-2.5 backdrop-blur-sm space-y-1.5">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Nivel de alerta</p>
          {([5, 4, 3] as const).map((level) => (
            <div key={level} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: LEVEL_COLORS[level] }} />
              <span className="text-2xs text-text-secondary">{LEVEL_LABELS[level]}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: LEVEL_COLORS[1] }} />
            <span className="text-2xs text-text-secondary">Sin alerta</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-1.5">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded border border-border bg-background-secondary/90 px-2.5 py-1.5 text-2xs text-text-muted backdrop-blur-sm transition-colors hover:text-text-primary"
          >
            <RefreshCw size={10} className={cn(loading && 'animate-spin')} />
            Actualizar
          </button>
          <button
            onClick={() => setShowNoAlertZones(v => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-2xs backdrop-blur-sm transition-colors',
              showNoAlertZones
                ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
                : 'border-border bg-background-secondary/90 text-text-muted hover:text-text-primary',
            )}
          >
            <Layers size={10} />
            Zonas
          </button>
        </div>
      </div>

      {/* User location label */}
      {userMarkerRef.current && (
        <div className="absolute bottom-8 right-3 flex items-center gap-1.5 rounded border border-accent-cyan/30 bg-background-secondary/90 px-2.5 py-1.5 backdrop-blur-sm pointer-events-none">
          <MapPin size={10} className="text-accent-cyan" />
          <span className="text-2xs text-accent-cyan">Tu ubicación</span>
        </div>
      )}

      {/* Click popup */}
      {popup && (
        <div
          className="absolute z-10 w-52 rounded-lg border border-border bg-background-secondary shadow-xl pointer-events-auto"
          style={{ left: Math.min(popup.x + 12, window.innerWidth - 230), top: Math.max(popup.y - 80, 60) }}
        >
          <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-1">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-wide text-text-primary leading-tight">
                {popup.area_name}
              </p>
              {popup.provinces && (
                <p className="text-2xs text-text-muted mt-0.5">{popup.provinces}</p>
              )}
            </div>
            <button onClick={() => setPopup(null)} className="shrink-0 text-text-muted hover:text-text-primary">
              <X size={12} />
            </button>
          </div>
          <div className="border-t border-border px-3 py-2 space-y-1.5">
            {popup.maxLevel >= 3 ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: LEVEL_COLORS[popup.maxLevel] }}
                  />
                  <span className={cn('text-2xs font-bold', LEVEL_TEXT_COLORS[popup.maxLevel])}>
                    Alerta {LEVEL_LABELS[popup.maxLevel]}
                  </span>
                </div>
                {popup.events.length > 0 && (
                  <div className="space-y-0.5">
                    {popup.events.map((ev) => (
                      <p key={ev} className="text-2xs text-text-secondary flex items-center gap-1">
                        <span className="text-text-muted">›</span> {ev}
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-2xs text-green-400">Sin alertas activas</p>
            )}
            {popup.updated && (
              <p className="text-2xs text-text-dim border-t border-border pt-1.5">
                Act. {new Date(popup.updated).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
