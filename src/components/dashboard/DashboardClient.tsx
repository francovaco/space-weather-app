'use client'
import { useState, useEffect, useRef } from 'react'
import { 
  AlertTriangle, ChevronRight, Snowflake, CheckCircle2, Eye, Gauge, 
  Wind, Droplets, MapPin, Sun, Cloud, CloudRain, CloudLightning, 
  Zap, Activity, Globe, Satellite, Thermometer,
  Sunrise, Sunset, Navigation, CloudSun
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LoadingMessage, EmptyMessage, ErrorMessage } from '@/components/ui/StatusMessages'
import { 
  XRayData, 
  ProtonFluxData, 
  KpIndexData, 
  GOESStatusData 
} from '@/types/swpc'

// ── Types ──

interface DailyForecast {
  date: string
  max: number
  min: number
  weather_id: number
  description: string
  sunrise: string
  sunset: string
  uv_index: number
  wind_speed: number
  precipitation: number
  precipitation_prob: number
  models: {
    gfs: { temp: number | null, wind: number | null, rain: number | null, hum: number | null, pres: number | null }
  }
}

interface WeatherData {
  current: {
    name: string
    temp: number
    description: string
    humidity: number
    st: number | null
    wind_speed: number
    wind_direction: number
    pressure: number
    visibility: number
    weather_id: number
    uv_index: number
    precipitation: number
    sunrise: string
    sunset: string
    is_day: boolean
  } | null
  forecast: DailyForecast[]
  alerts: any[]
}

interface Earthquake {
  id: string
  mag: number
  place: string
  country: string
  time: number
  depth: number
}

// ── Helpers ──

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function getWindDir(deg: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  return directions[Math.round(deg / 45) % 8]
}

function formatTime(iso: string) {
  if (!iso || iso === '') return '--:--'
  // Extraemos la hora directamente del string para evitar desfases por zona horaria local
  const timePart = iso.split('T')[1]
  return timePart ? timePart.substring(0, 5) : '--:--'
}

function getWeatherIcon(code: number, size = 24, className = "") {
  // Mapeo estricto a las 6 categorías permitidas
  if (code === 0) return <Sun size={size} className={cn("text-amber-400", className)} />
  if (code === 1 || code === 2) return <CloudSun size={size} className={cn("text-sky-300", className)} />
  if (code === 3 || (code >= 45 && code <= 48)) return <Cloud size={size} className={cn("text-slate-400", className)} />
  if (code >= 71 && code <= 77) return <Snowflake size={size} className={cn("text-white", className)} />
  if (code >= 51 && code <= 82) return <CloudRain size={size} className={cn("text-blue-400", className)} />
  return <CloudLightning size={size} className={cn("text-orange-500", className)} />
}

async function fetchEarthquakes(): Promise<Earthquake[]> {
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson')
    if (!res.ok) return []
    const data = await res.json()
    if (!data.features || !Array.isArray(data.features)) return []
    const now = Date.now()
    const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000)

    return data.features
      .filter((f: any) => {
        if (!f.properties?.place) return false
        const place = f.properties.place.toLowerCase()
        const time = f.properties.time
        return (place.includes('argentina') || place.includes('chile')) && time >= threeDaysAgo
      })
      .map((f: any) => {
        const placeParts = f.properties.place.split(', ')
        let city = placeParts[0]
        const country = placeParts[1] || 'Región'

        if (city.includes(' of ')) {
          city = city.split(' of ')[1]
        }

        return {
          id: f.id,
          mag: f.properties.mag,
          place: city,
          country: country,
          time: f.properties.time,
          depth: f.geometry?.coordinates?.[2] ?? 0
        }
      })
      .sort((a: any, b: any) => b.time - a.time)
      .slice(0, 10)
  } catch (err) {
    console.error('USGS fetch error:', err)
    return []
  }
}

// ── Component ──

export function DashboardClient() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [showIconRef, setShowIconRef] = useState(false)
  const [selectedDay, setSelectedDay] = useState<DailyForecast | null>(null)
  const [earthquakeData, setEarthquakeData] = useState<Earthquake[]>([])

  // Space weather data states
  const [xrayData, setXrayData] = useState<XRayData | null>(null)
  const [protonData, setProtonData] = useState<ProtonFluxData | null>(null)
  const [kpData, setKpData] = useState<KpIndexData | null>(null)
  const [goesData, setGoesData] = useState<GOESStatusData | null>(null)
  const [nasaPrecipData, setNasaPrecipData] = useState<{ last24h: number, last7d: number, monthTotal: number, latestDate: string, source: string } | null>(null)

  // Persist current coordinates across renders to avoid stale closures
  const currentCoordsRef = useRef<{ lat: number; lon: number } | null>(null)
  // Exposed so the retry button can trigger a re-fetch without restarting the effect
  const fetchWeatherRef = useRef<() => void>()

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined

    const fetchWeather = async (lat?: number, lon?: number) => {
      try {
        const url = (lat !== undefined && lon !== undefined) 
          ? `/api/smn/weather?lat=${lat}&lon=${lon}` 
          : `/api/smn/weather`
        
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setWeather(data)
          if (lat !== undefined && lon !== undefined) {
            currentCoordsRef.current = { lat, lon }
            localStorage.setItem('last_lat', lat.toString())
            localStorage.setItem('last_lon', lon.toString())

            // Also fetch extra data
            fetch(`/api/nasa/precipitation?lat=${lat}&lon=${lon}`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }).then(setNasaPrecipData).catch(() => null)
          }
        }
      } catch (err) { 
        console.error('Fetch error:', err)
      } finally { 
        setWeatherLoading(false) 
      }
    }

    const startPolling = (lat?: number, lon?: number) => {
      if (intervalId) clearInterval(intervalId)
      fetchWeather(lat, lon)
      intervalId = setInterval(() => fetchWeather(lat, lon), 60000)
    }

    // Expose for retry button: re-fetch with current coords
    fetchWeatherRef.current = () => {
      const coords = currentCoordsRef.current
      fetchWeather(coords?.lat, coords?.lon)
    }

    const savedLat = localStorage.getItem('last_lat')
    const savedLon = localStorage.getItem('last_lon')

    if (savedLat && savedLon) {
      const lat = parseFloat(savedLat)
      const lon = parseFloat(savedLon)
      currentCoordsRef.current = { lat, lon }
      setUsingFallback(false)
      startPolling(lat, lon)
    } else {
      setUsingFallback(true)
      startPolling()
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const newLat = p.coords.latitude
          const newLon = p.coords.longitude
          const prev = currentCoordsRef.current
          if (!prev || Math.abs(prev.lat - newLat) > 0.01) {
            setUsingFallback(false)
            startPolling(newLat, newLon)
          }
        },
        () => {
          if (weatherLoading && !weather) {
            setUsingFallback(true)
            startPolling()
          }
        },
        { timeout: 5000, enableHighAccuracy: false }
      )
    }

    fetchEarthquakes().then(setEarthquakeData)
    const eqInterval = setInterval(() => fetchEarthquakes().then(setEarthquakeData), 300000)

    const fetchWithTimeout = async (url: string, ms = 15000) => {
      const ctrl = new AbortController()
      const id = setTimeout(() => ctrl.abort(), ms)
      try {
        const r = await fetch(url, { signal: ctrl.signal })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      } finally {
        clearTimeout(id)
      }
    }

    const fetchSpace = async () => {
      try {
        const [xr, pr, kp, gs] = await Promise.all([
          fetchWithTimeout('/api/swpc/xray-flux'),
          fetchWithTimeout('/api/swpc/proton-flux'),
          fetchWithTimeout('/api/swpc/kp-index'),
          fetchWithTimeout('/api/goes/status'),
        ])
        setXrayData(xr)
        setProtonData(pr)
        setKpData(kp)
        setGoesData(gs)
      } catch (e) { console.error('Space data fetch error:', e) }
    }
    fetchSpace()
    const spaceInterval = setInterval(fetchSpace, 60000)

    // Extra data polling
    const fetchExtraData = () => {
      const lat = localStorage.getItem('last_lat')
      const lon = localStorage.getItem('last_lon')
      if (lat && lon) {
        fetch(`/api/nasa/precipitation?lat=${lat}&lon=${lon}`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }).then(setNasaPrecipData).catch(() => null)
      }
    }
    fetchExtraData()
    const extraInterval = setInterval(fetchExtraData, 300000)

    return () => {
      if (intervalId) clearInterval(intervalId)
      clearInterval(eqInterval)
      clearInterval(spaceInterval)
      clearInterval(extraInterval)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Space Weather Logic
  const xrayLong = xrayData?.find(d => d.energy === '0.1-0.8nm')
  const xrayInfo = xrayLong ? (() => {
    const val = xrayLong.flux
    if (val >= 1e-4) return { label: `X ${(val / 1e-4).toFixed(1)}`, color: 'text-red-500' }
    if (val >= 1e-5) return { label: `M ${(val / 1e-5).toFixed(1)}`, color: 'text-accent-orange' }
    if (val >= 1e-6) return { label: `C ${(val / 1e-6).toFixed(1)}`, color: 'text-yellow-400' }
    if (val >= 1e-7) return { label: `B ${(val / 1e-7).toFixed(1)}`, color: 'text-blue-400' }
    return { label: `A ${(val / 1e-8).toFixed(1)}`, color: 'text-blue-400' }
  })() : null

  const proton = protonData?.at(-1)
  const kp = kpData?.at(-1)?.kp ?? 0
  const kpInfo = (() => {
    if (kp >= 7) return { color: 'text-red-500', sub: 'Tormenta Fuerte' }
    if (kp >= 5) return { color: 'text-accent-orange', sub: 'Tormenta Menor' }
    if (kp >= 4) return { color: 'text-yellow-400', sub: 'Activo' }
    return { color: 'text-blue-400', sub: 'Tranquilo' }
  })()

  const gStatus = (() => {
    if (!goesData) return { label: '...', sub: 'Conectando', statusColor: 'text-text-muted' }
    
    // Find GOES-19 in the satellites array
    const goes19 = goesData.satellites.find(s => s.name.includes('19'))
    const color = goes19?.color || 'UNKNOWN'

    if (color === 'GREEN') return { label: 'OPERACIONAL', sub: 'Sistemas Nominales', statusColor: 'text-green-400' }
    if (color === 'YELLOW') return { label: 'LIMITADO', sub: 'Anomalía Menor', statusColor: 'text-yellow-400' }
    if (color === 'ORANGE' || color === 'RED') return { label: 'DEGRADADO', sub: 'Falla/Interrupción', statusColor: 'text-red-500' }
    
    return { label: 'DESCONOCIDO', sub: 'Sin Reporte', statusColor: 'text-text-muted' }
  })()

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Intro section */}
      <div className="rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-4 shadow-glow-blue/5">
        <div className="flex items-start gap-5">
          <div className="hidden sm:flex h-36 w-36 shrink-0 items-center justify-center rounded-xl bg-accent-cyan/10 ring-1 ring-accent-cyan/30 overflow-hidden">
            <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex-1">
            <div className="flex flex-col gap-3">
              <p className="text-[13px] font-black text-white leading-tight uppercase tracking-widest flex items-center gap-2">
                <img src="/assets/logo.png" alt="Logo" className="sm:hidden w-14 h-14 object-contain" />
                Plataforma avanzada de visualización de datos en tiempo real para el clima espacial y terrestre.
              </p>
              <p className="text-xs font-medium text-text-muted leading-relaxed uppercase tracking-tighter opacity-80">
                ESTE SISTEMA INTEGRA INFORMACIÓN DE LOS SISTEMAS DEL SATÉLITE GOES-19, DATOS ACTUALIZADOS DEL CLIMA TERRESTRE Y LOCAL Y MODELOS FÍSICOS DE ALTA PRECISIÓN. SU PROPÓSITO ES PROPORCIONAR UNA ALERTA TEMPRANA SOBRE FENÓMENOS SOLARES, VARIACIONES IONOSFÉRICAS, CONDICIONES CLIMÁTICAS LOCALES Y ALERTAS METEOROLÓGICAS EXTREMAS QUE AFECTAN A LA POBLACIÓN, LAS REDES ELÉCTRICAS, LAS COMUNICACIONES, LOS SISTEMAS GPS Y LA INFRAESTRUCTURA TECNOLÓGICA EN LA REGIÓN. <Link href="/space-weather" className="text-accent-cyan hover:text-white transition-colors border-b border-accent-cyan/30">VISITA LA SECCIÓN DE CLIMA ESPACIAL PARA COMPRENDER LOS IMPACTOS Y FENÓMENOS DETALLADOS.</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Monitor de Clima Espacial</h1>
        <p className="mt-1 text-xs text-text-muted">GOES-19 · Datos en Tiempo Real</p>
      </div>

      {/* Weather & SAT Section */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {/* Current Weather & Forecast */}
        {(!weatherLoading && !weather?.current) ? (
          <div className="card lg:col-span-3 h-[355px] flex items-center justify-center">
            <ErrorMessage
              message="Pronóstico no disponible"
              description="No se pudieron obtener los datos meteorológicos locales del SMN."
              onRetry={() => {
                setWeatherLoading(true)
                fetchWeatherRef.current?.()
              }}
            />
          </div>
        ) : (
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Current Weather */}
            <div className="card flex flex-col justify-between overflow-hidden border-accent-cyan/20 bg-background-card/50 h-[170px] p-3 px-6">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="section-label flex items-center gap-1.5">
                  <MapPin size={10} className={cn("text-accent-cyan", usingFallback && "text-text-dim")} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter font-display">{usingFallback ? 'Ubicación Detectada' : 'Clima Local'}</span>
                </span>
                <button 
                  onClick={() => setShowIconRef(true)} 
                  className="flex items-center justify-center w-4 h-4 rounded-full border border-text-dim/50 text-text-dim hover:text-white hover:border-white transition-colors font-display text-[10px] font-black pb-0.5"
                >
                  i
                </button>
              </div>

              {weatherLoading ? (
                <LoadingMessage message="Cargando clima…" className="flex-1 py-0" />
              ) : (
                <div className="flex items-center gap-10 flex-1 px-4">
                  {/* Left: Temp, Icon & Location */}
                  <div className="flex flex-col shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-4xl font-black text-text-primary tabular-nums tracking-tighter leading-none">
                        {Math.round(weather!.current!.temp)}°C
                      </span>
                      {getWeatherIcon(weather!.current!.weather_id, 44, "drop-shadow-glow-blue")}
                    </div>
                    <p className="mt-1.5 text-[14px] font-black text-accent-cyan uppercase tracking-wide font-display">{weather!.current!.name}</p>
                    <p className="text-[11px] text-text-muted font-bold mt-0.5 tracking-tight uppercase font-display">{weather!.current!.description}</p>
                  </div>

                  {/* Center: Larger Details, Same Level */}
                  <div className="grid grid-cols-5 gap-x-6 gap-y-2 flex-1 justify-center">
                    <WeatherDetail icon={<Wind size={14} className="text-accent-cyan" />} label="Viento" value={`${Math.round(weather!.current!.wind_speed)}k/h`} />
                    <WeatherDetail icon={<Navigation size={14} className="text-accent-cyan" style={{ transform: `rotate(${weather!.current!.wind_direction}deg)` }} />} label="Dir." value={getWindDir(weather!.current!.wind_direction)} />
                    <WeatherDetail icon={<Droplets size={14} className="text-accent-amber" />} label="Humedad" value={`${weather!.current!.humidity}%`} />
                    <WeatherDetail icon={<Gauge size={14} className="text-accent-teal" />} label="Presión" value={`${Math.round(weather!.current!.pressure)}`} />
                    <WeatherDetail icon={<Eye size={14} className="text-accent-cyan" />} label="Visib." value={`${weather!.current!.visibility.toFixed(0)}km`} />
                    
                    <WeatherDetail icon={<Sunrise size={14} className="text-orange-400" />} label="Amanecer" value={formatTime(weather!.current!.sunrise)} />
                    <WeatherDetail icon={<Sunset size={14} className="text-orange-600" />} label="Atardecer" value={formatTime(weather!.current!.sunset)} />
                    <WeatherDetail icon={<Zap size={14} className="text-accent-amber" />} label="Índice UV" value={`${weather!.current!.uv_index.toFixed(1)}`} />
                    <WeatherDetail icon={<CloudRain size={14} className="text-blue-400" />} label="Lluvia" value={`${weather!.current!.precipitation.toFixed(1)}mm`} />
                    <WeatherDetail icon={<Thermometer size={14} className="text-accent-red" />} label="ST" value={`${Math.round(weather!.current!.st || 0)}°C`} />
                  </div>
                </div>
              )}
            </div>

            {/* 7-Day Forecast */}
            <div className="card overflow-hidden border-white/5 h-[230px] flex flex-col p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="section-label text-[12px] font-black uppercase tracking-[0.25em] text-accent-cyan/90">Pronóstico de 7 Días</span>
                <div className="h-px flex-1 mx-8 bg-gradient-to-r from-accent-cyan/30 to-transparent" />
              </div>
              {weatherLoading ? (
                <LoadingMessage message="Cargando pronóstico…" className="flex-1 py-0" />
              ) : (
                <div className="grid grid-cols-7 gap-3 flex-1 items-center">
                  {weather!.forecast.map((f, i) => {
                    const dateObj = new Date(f.date + 'T12:00:00')
                    const dayStr = DAY_NAMES_SHORT[dateObj.getDay()]
                    return (
                      <button 
                        key={f.date} 
                        onClick={() => setSelectedDay(f)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-3 rounded-2xl py-4 px-1 transition-all group",
                          i === 0 ? "bg-accent-cyan/10 ring-1 ring-accent-cyan/30" : "hover:bg-white/[0.05] hover:ring-1 hover:ring-white/20"
                        )}
                      >
                        <span className={cn("text-[13px] font-black uppercase tracking-tighter font-display", i === 0 ? "text-accent-cyan" : "text-text-dim group-hover:text-text-primary")}>
                          {i === 0 ? 'Hoy' : dayStr}
                        </span>
                        {getWeatherIcon(i === 0 ? weather!.current!.weather_id : f.weather_id, 40, "drop-shadow-glow-blue transition-transform group-hover:scale-110")}
                        <div className="flex flex-col items-center">
                          <span className="font-display text-2xl font-black text-white leading-none tracking-tighter">{Math.round(f.max)}°</span>
                          <span className="text-[13px] font-bold text-text-muted mt-1 tracking-tighter font-display">{Math.round(f.min)}°</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SAT Alerts */}
        <div className={cn(
          "card border-accent-orange/30 bg-accent-orange/5 flex flex-col h-[412px]",
          (!weatherLoading && !weather?.current) ? "lg:col-span-1" : "lg:col-span-1"
        )}>
          <div className="flex items-center justify-between mb-3 shrink-0">
            <span className="section-label flex items-center gap-2 text-accent-orange text-[15px] font-bold uppercase">
              <AlertTriangle size={16} />
              Alertas (SAT)
            </span>
            <span className="pulse-dot bg-accent-orange shadow-glow-orange h-1.5 w-1.5" />
          </div>
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
            {/* Estado de Alertas Meteorológicas */}
            <div className="space-y-2">
              {weather?.alerts && weather.alerts.length > 0 ? (
                <>
                  {weather.alerts.map((alert: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 group hover-marquee">
                      <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <div className="flex-1 overflow-hidden">
                        <div className="marquee-container">
                          <p className="marquee-content text-[14px] font-black text-white leading-tight uppercase">{alert.title || 'Alerta Meteorológica'}</p>
                        </div>
                        <div className="marquee-container">
                          <p className="marquee-content text-[12px] font-bold text-red-400/90 mt-1 leading-tight uppercase">{alert.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-[14px] font-black text-white leading-tight uppercase tracking-tighter">Sin Alertas Críticas</p>
                    <p className="mt-0.5 text-[13px] font-bold leading-normal text-green-400/80 uppercase tracking-tight">Condiciones estables.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sismos */}
            <div className="space-y-1.5 pt-1 border-t border-white/5">
              <p className="text-[13px] font-black text-accent-cyan uppercase tracking-widest mb-1.5">Sismos Recientes (CL/AR)</p>
              {earthquakeData && earthquakeData.length > 0 ? (
                earthquakeData.map(eq => (
                  <Link 
                    key={eq.id} 
                    href={`https://earthquake.usgs.gov/earthquakes/eventpage/${eq.id}/executive`}
                    target="_blank"
                    className="flex items-center justify-between border-b border-white/5 pb-1 last:border-0 last:pb-0 hover:bg-white/5 transition-colors group px-1 rounded overflow-hidden"
                  >
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <div className="marquee-container">
                        <span className="marquee-content text-[13px] font-bold text-white leading-tight group-hover:text-accent-cyan transition-colors">
                          {eq.place}, {eq.country} | Prof: {Math.round(eq.depth)}km
                        </span>
                      </div>
                      <span className="text-[10px] text-text-dim uppercase tracking-tighter font-display font-black leading-none mt-1.5">
                        {new Date(eq.time).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', '')}
                      </span>
                    </div>
                    <span className={cn(
                      "text-base font-black ml-2 tabular-nums shrink-0",
                      eq.mag >= 5 ? "text-red-500" : eq.mag >= 4 ? "text-accent-orange" : "text-yellow-400"
                    )}>
                      {eq.mag.toFixed(1)}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-[12px] text-text-dim uppercase font-bold italic">Buscando actividad sísmica...</p>
              )}
            </div>
          </div>

          {/* Footer Buttons - Always at bottom, non-scrollable */}
          <div className="mt-3 space-y-1 pt-2 border-t border-white/5 shrink-0">
            <Link href="https://www.inpres.gob.ar/desktop/" target="_blank" className="flex items-center justify-between rounded-lg border border-border bg-background-secondary/50 px-2 py-1.5 text-[12px] font-black text-text-muted hover:text-white hover:border-accent-cyan transition-all group">
              <span className="uppercase tracking-widest">Sismos INPRES</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform text-accent-cyan" />
            </Link>
            <Link href="https://www.smn.gob.ar/alertas" target="_blank" className="flex items-center justify-between rounded-lg border border-border bg-background-secondary/50 px-2 py-1.5 text-[12px] font-black text-text-muted hover:text-white hover:border-accent-cyan transition-all group">
              <span className="uppercase tracking-widest">Mapa sistema de alerta temprana</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform text-accent-cyan" />
            </Link>
          </div>
        </div>

      </div>

      {/* Quick status cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatusCard label="Clase Rayos X" value={xrayInfo?.label ?? '—'} sub="Onda corta 0.1–0.8 nm" color={xrayInfo?.color ?? 'text-text-muted'} icon={<Zap size={14} />} href="/instruments/xray-flux" loading={!xrayData} />
        <StatusCard label="Flujo de Protones" value={proton ? (proton.flux as number).toFixed(2) : '—'} sub="≥10 MeV pfu" color={proton && (proton.flux as number) >= 10 ? 'text-accent-orange' : 'text-blue-400'} icon={<Activity size={14} />} href="/instruments/proton-flux" loading={!protonData} />
        <StatusCard label="Índice Kp" value={kpData?.at(-1) ? kpData.at(-1)!.kp.toFixed(1) : '—'} sub={kpInfo?.sub ?? 'Cargando…'} color={kpInfo?.color ?? 'text-text-muted'} icon={<Globe size={14} />} href="/instruments/kp-index" loading={!kpData} />
        <StatusCardNasaPrecip data={nasaPrecipData} />
        <StatusCard
          label="GOES-19"
          value={gStatus.label}
          sub={gStatus.sub}
          color={gStatus.statusColor}
          icon={<Satellite size={14} />}
          href="/satellite-status"
          loading={!goesData}
        />
      </div>

      {/* Quick links grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <QuickLink title="Imágenes ABI" description="16 canales · Disco Completo SSA" href="/imagery" icon={<Satellite size={18} />} color="text-accent-cyan" />
        <QuickLink title="Flujo de Rayos X" description="Llamaradas solares tiempo real" href="/instruments/xray-flux" icon={<Zap size={18} />} color="text-accent-amber" />
        <QuickLink title="Magnetómetro" description="Tormentas geomagnéticas" href="/instruments/magnetometer" icon={<Activity size={18} />} color="text-primary" />
        <QuickLink title="Pronóstico de Aurora" description="Polos Norte y Sur 30 min" href="/aurora" icon={<Wind size={18} />} color="text-purple-400" />
        <QuickLink title="Coronógrafo" description="Detección de CMEs (CCOR-1)" href="/instruments/coronagraph" icon={<Globe size={18} />} color="text-accent-teal" />
        <QuickLink title="Viento Solar" description="Modelo WSA-ENLIL" href="/solar-wind" icon={<Wind size={18} />} color="text-accent-orange" />
      </div>

      {/* Icon Reference Modal */}
      {showIconRef && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setShowIconRef(false)} role="presentation">
          <div className="card w-full max-w-sm border-accent-cyan/30 shadow-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Iconografía Meteorológica">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Iconografía Meteorológica</h3>
              <button onClick={() => setShowIconRef(false)} className="text-text-dim hover:text-white transition-colors">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <IconRef code={0} label="Despejado" />
              <IconRef code={1} label="Parcialmente Nublado" />
              <IconRef code={3} label="Nublado" />
              <IconRef code={80} label="Lluvia" />
              <IconRef code={71} label="Nieve / Aguanieve" />
              <IconRef code={95} label="Tormenta Eléctrica" />
            </div>
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setSelectedDay(null)} role="presentation">
          <div className="card w-full max-w-sm border-accent-cyan/30 shadow-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Reporte Detallado del Día">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <div className="flex flex-col">
                <h3 className="text-base font-black uppercase tracking-widest text-white">
                  {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <span className="text-xs text-accent-cyan font-bold uppercase mt-0.5 font-display">Reporte Detallado</span>
              </div>
              <button onClick={() => setSelectedDay(null)} className="text-text-dim hover:text-white transition-colors">✕</button>
            </div>
            
            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 mb-4">
              <div className="flex flex-col">
                <span className="text-4xl font-display font-black text-white">{Math.round(selectedDay.max)}° / {Math.round(selectedDay.min)}°</span>
                <span className="text-sm font-bold text-accent-cyan uppercase mt-1 font-display">{selectedDay.description}</span>
              </div>
              {getWeatherIcon(selectedDay.weather_id, 64, "drop-shadow-glow-blue")}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <WeatherDetail icon={<Sunrise size={14} className="text-orange-400" />} label="Amanecer" value={formatTime(selectedDay.sunrise)} />
              <WeatherDetail icon={<Sunset size={14} className="text-orange-600" />} label="Atardecer" value={formatTime(selectedDay.sunset)} />
              <WeatherDetail icon={<Zap size={14} className="text-accent-amber" />} label="Índice UV" value={`${selectedDay.uv_index.toFixed(1)}`} />
              <WeatherDetail icon={<Wind size={14} className="text-accent-cyan" />} label="Viento Máx." value={`${Math.round(selectedDay.wind_speed)}k/h`} />
              <WeatherDetail icon={<CloudRain size={14} className="text-blue-400" />} label="Lluvia" value={`${selectedDay.precipitation.toFixed(1)}mm`} />
              <WeatherDetail icon={<Activity size={14} className="text-accent-teal" />} label="Prob. Lluvia" value={`${selectedDay.precipitation_prob}%`} />
            </div>

            {/* Model Comparison Table */}
            <div className="mb-6 rounded-lg border border-white/5 bg-black/20 p-3">
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-accent-cyan/80">Comparación Modelo GFS (USA)</p>
              <div className="grid grid-cols-2 gap-2 border-b border-white/5 pb-1 mb-1 text-[10px] font-bold uppercase text-text-muted">
                <span>Dato</span>
                <span className="text-right">Predicción GFS</span>
              </div>
              <div className="space-y-1.5">
                <ModelRow label="Temp Máx" val={selectedDay.models.gfs.temp !== null ? `${Math.round(selectedDay.models.gfs.temp)}°` : '—'} />
                <ModelRow label="Viento Máx" val={selectedDay.models.gfs.wind !== null ? `${Math.round(selectedDay.models.gfs.wind)}k/h` : '—'} />
                <ModelRow label="Lluvia" val={selectedDay.models.gfs.rain !== null ? `${selectedDay.models.gfs.rain.toFixed(1)}mm` : '—'} />
                <ModelRow label="Humedad" val={selectedDay.models.gfs.hum !== null ? `${Math.round(selectedDay.models.gfs.hum)}%` : '—'} />
                <ModelRow label="Presión" val={selectedDay.models.gfs.pres !== null ? `${Math.round(selectedDay.models.gfs.pres)}` : '—'} />
              </div>
            </div>

            <p className="text-[10px] text-text-muted leading-relaxed uppercase font-bold font-display border-t border-white/5 pt-4">
              Pronóstico detallado para la jornada. Los valores representan estimaciones basadas en modelos globales de alta resolución.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function WeatherDetail({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-1 text-text-dim">
        <div className="w-4 flex justify-center">{icon}</div>
        <span className="text-[11px] font-display font-black uppercase tracking-tighter leading-none">{label}</span>
      </div>
      <span className="text-[15px] font-display font-bold text-text-primary tabular-nums ml-[24px] leading-none mt-0.5">{value}</span>
    </div>
  )
}

function QuickLink({ title, description, href, icon, color }: { title: string, description: string, href: string, icon: React.ReactNode, color: string }) {
  return (
    <Link href={href} className="group relative overflow-hidden rounded-xl border border-white/5 bg-background-card/30 p-4 transition-all hover:border-accent-cyan/30 hover:bg-accent-cyan/5">
      <div className="flex items-center gap-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background-secondary ring-1 ring-white/10 transition-all group-hover:scale-110 group-hover:ring-accent-cyan/30", color)}>
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-black uppercase tracking-widest text-text-primary group-hover:text-accent-cyan transition-colors">{title}</span>
          <span className="text-[12px] font-bold text-text-muted uppercase mt-0.5 tracking-tighter">{description}</span>
        </div>
      </div>
      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
    </Link>
  )
}

function StatusCard({ label, value, sub, color, icon, href, loading }: { label: string, value: string, sub: string, color: string, icon: React.ReactNode, href: string, loading?: boolean }) {
  return (
    <Link href={href} className="card group border-white/5 bg-background-card/30 p-3 transition-all hover:border-white/10 hover:bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">{label}</span>
        <div className={cn("transition-transform group-hover:scale-110", color)}>
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="h-6 w-16 animate-pulse rounded bg-white/5" />
      ) : (
        <>
          <p className={cn("text-xl font-display font-black leading-none tracking-tight", color)}>{value}</p>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-tighter text-text-dim line-clamp-1">{sub}</p>
        </>
      )}
    </Link>
  )
}

function IconRef({ code, label }: { code: number, label: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3 ring-1 ring-white/5">
      <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-black/20 rounded">
        {getWeatherIcon(code, 24)}
      </div>
      <span className="text-[13px] font-bold uppercase tracking-tighter text-text-secondary leading-tight">{label}</span>
    </div>
  )
}

function StatusCardLightning({ data }: { data: { count: number, closest: number | null, status: string } | null }) {
  return (
    <div className="card group border-white/5 bg-background-card/30 p-3 transition-all hover:border-white/10 hover:bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">Monitor Rayos</span>
        <div className={cn("transition-transform group-hover:scale-110", data?.count && data.count > 0 ? "text-accent-orange" : "text-text-muted")}>
          <Zap size={14} className={cn(data?.count && data.count > 0 && "animate-pulse")} />
        </div>
      </div>
      {!data ? (
        <div className="h-6 w-16 animate-pulse rounded bg-white/5" />
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <p className={cn("text-xl font-display font-black leading-none tracking-tight", data.count > 0 ? "text-accent-orange" : "text-text-primary")}>
              {data.count}
            </p>
            <span className="text-[10px] font-bold text-text-dim uppercase font-display">en zona</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-tighter text-text-dim line-clamp-1 font-display">
              {data.count > 0 ? `${data.closest?.toFixed(1)}km` : 'Sin actividad'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function StatusCardNasaPrecip({ data }: { data: { last24h: number | null, last7d: number, monthTotal: number, latestDate: string, source: string } | null }) {
  return (
    <div className="card group border-white/10 bg-background-card/30 p-3 transition-all hover:border-accent-teal/30 hover:bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">Lluvia Satelital</span>
        <div className={cn("transition-transform group-hover:scale-110", data ? "text-accent-teal" : "text-text-muted")}>
          <CloudRain size={14} />
        </div>
      </div>
      {!data ? (
        <div className="h-6 w-16 animate-pulse rounded bg-white/5" />
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-display font-black leading-none tracking-tight text-text-primary tabular-nums">
              {data.last24h !== null ? data.last24h.toFixed(1) : 'S/D'}
            </p>
            <span className="text-[10px] font-bold text-text-dim uppercase font-display">{data.last24h !== null ? 'mm (24h)' : 'Sin datos'}</span>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-[11px] font-black uppercase tracking-tighter text-text-dim line-clamp-1 font-display">
              7 d: {data.last7d.toFixed(1)}mm · Mes: {Math.round(data.monthTotal)}mm
            </p>
            <p className="text-[10px] font-black uppercase tracking-tighter text-text-muted line-clamp-1 font-display opacity-70">
              NASA GPM · {data.latestDate}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function ModelRow({ label, val }: { label: string, val: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px] font-display">
      <span className="text-text-muted uppercase font-bold">{label}</span>
      <span className="text-right font-black text-text-primary tabular-nums text-[13px]">{val}</span>
    </div>
  )
}
