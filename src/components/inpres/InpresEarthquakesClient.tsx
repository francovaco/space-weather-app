'use client'
// ============================================================
// src/components/inpres/InpresEarthquakesClient.tsx
// Mapa + tabla de sismos INPRES Argentina con MapLibre GL
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { RefreshCw, AlertTriangle, LocateFixed, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InpresEarthquake } from '@/app/api/inpres/earthquakes/route'

// ── Constants ─────────────────────────────────────────────────

function magColor(mag: number): string {
  if (mag >= 6.0) return '#ef4444'   // rojo
  if (mag >= 5.0) return '#f97316'   // naranja
  if (mag >= 4.0) return '#f59e0b'   // amarillo
  if (mag >= 3.0) return '#22c55e'   // verde
  return '#64748b'                    // gris
}

function magRadius(mag: number): number {
  if (mag >= 6.0) return 14
  if (mag >= 5.0) return 11
  if (mag >= 4.0) return 8
  if (mag >= 3.0) return 6
  return 4
}

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

export function InpresEarthquakesClient() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const popupRef = useRef<maplibregl.Popup | null>(null)

  const [earthquakes, setEarthquakes] = useState<InpresEarthquake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<string | null>(null)
  const [selected, setSelected] = useState<InpresEarthquake | null>(null)
  const [locating, setLocating] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/inpres/earthquakes')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: InpresEarthquake[] = await res.json()
      setEarthquakes(data)
      setLastFetch(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
    } catch (err) {
      console.error('[InpresEarthquakes]', err)
      setError('No se pudieron cargar los datos de INPRES')
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
      center: [-65, -34],
      zoom: 4,
      minZoom: 3,
      maxZoom: 14,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      fitBoundsOptions: { maxZoom: 9 },
    })
    map.addControl(geolocate, 'top-right')
    geolocateRef.current = geolocate
    geolocate.on('geolocate', () => setLocating(false))
    geolocate.on('error', () => setLocating(false))

    map.on('load', () => {
      mapRef.current = map
      setMapLoaded(true)
    })

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Place markers whenever earthquakes data or map load state changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || earthquakes.length === 0) return

    // Remove old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }

    earthquakes.forEach(eq => {
      const el = document.createElement('div')
      const size = magRadius(eq.mag) * 2
      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${magColor(eq.mag)};
        border: 2px solid rgba(255,255,255,0.6);
        cursor: pointer;
        box-shadow: 0 0 ${size}px ${magColor(eq.mag)}80;
        opacity: ${eq.reviewed ? '1' : '0.65'};
      `

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([eq.lon, eq.lat])
        .addTo(map)

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setSelected(eq)
        if (popupRef.current) popupRef.current.remove()
        popupRef.current = new maplibregl.Popup({ closeButton: false, offset: magRadius(eq.mag) + 4 })
          .setLngLat([eq.lon, eq.lat])
          .setHTML(`
            <div style="font-family:monospace;font-size:11px;color:#e2e8f0;min-width:140px;">
              <div style="font-weight:bold;font-size:13px;color:${magColor(eq.mag)};margin-bottom:4px;">M ${eq.mag.toFixed(1)}</div>
              <div>${eq.province}</div>
              <div style="color:#94a3b8;">${eq.fecha} ${eq.hora} ARG</div>
              <div style="color:#94a3b8;">Prof: ${eq.depth} km</div>
              ${!eq.reviewed ? '<div style="color:#60a5fa;margin-top:2px;">⚠ Automático</div>' : ''}
            </div>
          `)
          .addTo(map)
      })

      markersRef.current.push(marker)
    })
  }, [earthquakes, mapLoaded])

  // Initial load + auto-refresh every 5 min
  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleLocate = () => {
    if (!geolocateRef.current) return
    setLocating(true)
    geolocateRef.current.trigger()
  }

  const handleRowClick = (eq: InpresEarthquake) => {
    setSelected(eq)
    const map = mapRef.current
    if (!map) return
    map.flyTo({ center: [eq.lon, eq.lat], zoom: 8, duration: 900 })
    if (popupRef.current) popupRef.current.remove()
    popupRef.current = new maplibregl.Popup({ closeButton: false, offset: magRadius(eq.mag) + 4 })
      .setLngLat([eq.lon, eq.lat])
      .setHTML(`
        <div style="font-family:monospace;font-size:11px;color:#e2e8f0;min-width:140px;">
          <div style="font-weight:bold;font-size:13px;color:${magColor(eq.mag)};margin-bottom:4px;">M ${eq.mag.toFixed(1)}</div>
          <div>${eq.province}</div>
          <div style="color:#94a3b8;">${eq.fecha} ${eq.hora} ARG</div>
          <div style="color:#94a3b8;">Prof: ${eq.depth} km</div>
          ${!eq.reviewed ? '<div style="color:#60a5fa;margin-top:2px;">⚠ Automático</div>' : ''}
        </div>
      `)
      .addTo(map)
  }

  return (
    <div className="flex flex-col gap-3 h-full lg:flex-row">

      {/* Map */}
      <div className="relative flex-1 min-h-[400px] rounded-lg border border-border overflow-hidden">
        <div ref={mapContainer} className="h-full w-full" />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-4 py-2.5">
              <RefreshCw size={14} className="animate-spin text-accent-cyan" />
              <span className="text-xs text-text-secondary">Cargando sismos INPRES…</span>
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

        {/* Top-left info */}
        <div className="absolute left-3 top-3 pointer-events-none">
          <div className="rounded-lg border border-border bg-background-secondary/90 px-3 py-2 backdrop-blur-sm">
            <p className="font-display text-xs font-bold uppercase tracking-wider text-text-primary">
              Sismos Recientes
            </p>
            <p className="text-2xs text-text-muted">
              INPRES · {earthquakes.length} eventos · últimas horas
            </p>
          </div>
        </div>

        {/* Bottom-left: legend + controls */}
        <div className="absolute bottom-4 left-3 space-y-2">
          {/* Legend */}
          <div className="rounded-lg border border-border bg-background-secondary/90 px-3 py-2 backdrop-blur-sm space-y-1.5">
            <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Magnitud</p>
            {([
              { label: '≥ 6.0', color: '#ef4444' },
              { label: '≥ 5.0', color: '#f97316' },
              { label: '≥ 4.0', color: '#f59e0b' },
              { label: '≥ 3.0', color: '#22c55e' },
              { label: '< 3.0', color: '#64748b' },
            ]).map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-2xs text-text-secondary">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 border-t border-border pt-1">
              <span className="text-2xs text-blue-400">⚠</span>
              <span className="text-2xs text-text-muted">Determinación automática</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-1.5">
            <button
              onClick={() => loadData()}
              className="flex items-center gap-1.5 rounded border border-border bg-background-secondary/90 px-2.5 py-1.5 text-2xs text-text-muted backdrop-blur-sm transition-colors hover:text-text-primary"
            >
              <RefreshCw size={10} className={cn(loading && 'animate-spin')} />
              Actualizar
            </button>
            <button
              onClick={handleLocate}
              className="flex items-center gap-1.5 rounded border border-border bg-background-secondary/90 px-2.5 py-1.5 text-2xs text-text-muted backdrop-blur-sm transition-colors hover:text-accent-cyan hover:border-accent-cyan/40"
            >
              <LocateFixed size={10} className={cn(locating && 'animate-pulse text-accent-cyan')} />
              Mi ubicación
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar list */}
      <div className="lg:w-72 flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-accent-cyan" />
            <span className="text-xs font-bold uppercase tracking-widest text-text-primary">Lista de sismos</span>
          </div>
          {lastFetch && (
            <span className="text-2xs text-text-dim">Act. {lastFetch}</span>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {earthquakes.length === 0 && !loading ? (
            <div className="flex items-center justify-center h-24 text-xs text-text-muted">
              Sin datos disponibles
            </div>
          ) : (
            earthquakes.map(eq => (
              <button
                key={eq.id}
                onClick={() => handleRowClick(eq)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-border/40',
                  selected?.id === eq.id && 'bg-primary/10'
                )}
              >
                {/* Magnitude badge */}
                <div
                  className="shrink-0 flex items-center justify-center rounded text-2xs font-bold w-9 h-7"
                  style={{ background: magColor(eq.mag) + '25', color: magColor(eq.mag), border: `1px solid ${magColor(eq.mag)}50` }}
                >
                  M{eq.mag.toFixed(1)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{eq.province}</p>
                  <p className="text-2xs text-text-muted">{eq.fecha} {eq.hora} · {eq.depth} km</p>
                </div>

                {/* Auto badge */}
                {!eq.reviewed && (
                  <span className="text-2xs text-blue-400 shrink-0">AUTO</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
