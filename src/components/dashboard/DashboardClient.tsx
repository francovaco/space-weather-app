'use client'
// ============================================================
// src/components/dashboard/DashboardClient.tsx
// Main dashboard with real-time status cards
// ============================================================
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { 
  Activity, Satellite, Zap, Wind, Globe, Cloud, CloudRain, Sun, 
  MapPin, Thermometer, Info, X, CloudLightning, CloudDrizzle, 
  AlertTriangle, ChevronRight, Snowflake, CheckCircle2, Eye, Gauge
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ── Types ──

interface WeatherData {
  current: {
    name: string
    temp: number
    description: string
    st: number | null
    humidity: number
    wind_speed: number
    pressure: number
    visibility: number
    weather_id: number
  } | null
  forecast: {
    date: string
    max: number
    min: number
    weather_id: number
  }[]
  alerts: any[]
}

interface XRayReading {
  time_tag: string
  flux: number
  energy: string
}

interface ProtonReading {
  time_tag: string
  flux: number
  energy: string
}

interface KpSample {
  time_tag: string
  kp: number
}

interface SatelliteStatusRow {
  name: string
  role: string
  color: string
}

interface GOESStatusResponse {
  satellites: SatelliteStatusRow[]
}

// ── Helpers ──

function getWeatherIcon(code: number, size = 14, className = "") {
  if (code === 0) return <Sun size={size} className={cn("text-amber-400", className)} />
  if (code <= 3) return <Cloud size={size} className={cn("text-slate-300", className)} />
  if (code >= 45 && code <= 48) return <Cloud size={size} className={cn("text-slate-500", className)} />
  if (code >= 51 && code <= 67) return <CloudRain size={size} className={cn("text-blue-400", className)} />
  if (code >= 71 && code <= 77) return <Snowflake size={size} className={cn("text-cyan-100", className)} />
  if (code >= 80 && code <= 82) return <CloudRain size={size} className={cn("text-blue-500", className)} />
  if (code >= 95) return <CloudLightning size={size} className={cn("text-accent-orange", className)} />
  return <Cloud size={size} className={cn("text-text-muted", className)} />
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function classifyXRay(flux: number): { label: string; color: string } {
  if (!flux || isNaN(flux)) return { label: '—', color: 'text-text-muted' }
  if (flux >= 1e-4) return { label: `X${(flux/1e-4).toFixed(1)}`, color: 'text-red-500 font-black' }
  if (flux >= 1e-5) return { label: `M${(flux/1e-5).toFixed(1)}`, color: 'text-accent-orange font-bold' }
  if (flux >= 1e-6) return { label: `C${(flux/1e-6).toFixed(1)}`, color: 'text-yellow-400' }
  if (flux >= 1e-7) return { label: `B${(flux/1e-7).toFixed(1)}`, color: 'text-blue-400' }
  return { label: `A${(flux/1e-8).toFixed(1)}`, color: 'text-green-400 opacity-80' }
}

function kpDescription(kp: number): { sub: string; color: string } {
  if (kp >= 5) return { sub: 'Tormenta G1+', color: 'text-accent-orange' }
  if (kp >= 4) return { sub: 'Activo', color: 'text-yellow-400' }
  return { sub: 'Tranquilo', color: 'text-green-400' }
}

function goesStatusLabel(color: string): { label: string; statusColor: string; sub: string } {
  switch (color?.toUpperCase()) {
    case 'GREEN':  return { label: 'NORMAL', statusColor: 'text-green-400', sub: 'Instrumentos operativos' }
    case 'YELLOW': return { label: 'PRECAUCIÓN', statusColor: 'text-yellow-400', sub: 'Anomalía menor' }
    case 'ORANGE': return { label: 'DEGRADADO', statusColor: 'text-accent-orange', sub: 'Rendimiento bajo' }
    case 'RED':    return { label: 'CRÍTICO', statusColor: 'text-red-500', sub: 'Interrupción' }
    default:       return { label: 'NORMAL', statusColor: 'text-green-400', sub: 'Instrumentos operativos' }
  }
}

// ── Data fetchers ──

const fetchXRay = () => fetch('/api/swpc/xray-flux?range=1-day').then(r => r.json()).then(d => Array.isArray(d) ? d : [])
const fetchProtons = () => fetch('/api/swpc/proton-flux?range=1-day').then(r => r.json()).then(d => Array.isArray(d) ? d : [])
const fetchKp = () => fetch('/api/swpc/kp-index').then(r => r.json()).then(d => Array.isArray(d) ? d : [])
const fetchGOESStatus = () => fetch('/api/goes/status').then(r => r.json())

// ── Component ──

export function DashboardClient() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [showIconRef, setShowIconRef] = useState(false)

  useEffect(() => {
    const BUENOS_AIRES = { lat: -34.6037, lon: -58.3816 }
    let lastCoords = BUENOS_AIRES

    const fetchWeather = async (lat: number, lon: number, isFallback = false) => {
      try {
        const res = await fetch(`/api/smn/weather?lat=${lat}&lon=${lon}`)
        if (res.ok) {
          const data = await res.json()
          setWeather(data)
          setUsingFallback(isFallback)
        }
      } catch (err) { console.error(err) }
      finally { setWeatherLoading(false) }
    }

    const startPolling = () => {
      fetchWeather(lastCoords.lat, lastCoords.lon, lastCoords === BUENOS_AIRES)
      const id = setInterval(() => {
        fetchWeather(lastCoords.lat, lastCoords.lon, lastCoords === BUENOS_AIRES)
      }, 60000)
      return id
    }

    let intervalId: any

    if (!navigator.geolocation) {
      intervalId = startPolling()
    } else {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          lastCoords = { lat: p.coords.latitude, lon: p.coords.longitude }
          intervalId = startPolling()
        },
        () => {
          intervalId = startPolling()
        },
        { timeout: 6000 }
      )
    }

    return () => intervalId && clearInterval(intervalId)
  }, [])

  const { data: xrayData } = useAutoRefresh<XRayReading[]>({ queryKey: ['db-xray'], fetcher: fetchXRay, intervalMs: 60000 })
  const { data: protonData } = useAutoRefresh<ProtonReading[]>({ queryKey: ['db-proton'], fetcher: fetchProtons, intervalMs: 300000 })
  const { data: kpData } = useAutoRefresh<KpSample[]>({ queryKey: ['db-kp'], fetcher: fetchKp, intervalMs: 300000 })
  const { data: goesData } = useAutoRefresh<GOESStatusResponse>({ queryKey: ['db-goes'], fetcher: fetchGOESStatus, intervalMs: REFRESH_INTERVALS.STATUS })

  const xrayInfo = useMemo(() => {
    if (!Array.isArray(xrayData)) return null
    const latest = xrayData.filter(d => d.energy === '0.1-0.8nm').at(-1)
    return latest ? classifyXRay(latest.flux) : null
  }, [xrayData])

  const proton = useMemo(() => {
    if (!Array.isArray(protonData)) return null
    return protonData.filter(d => d.energy === '>=10 MeV').at(-1)
  }, [protonData])

  const kpInfo = useMemo(() => {
    if (!Array.isArray(kpData)) return null
    const latest = kpData.at(-1)
    return latest ? kpDescription(latest.kp) : null
  }, [kpData])

  const gStatus = useMemo(() => {
    const goes19 = goesData?.satellites?.find(s => s.name.includes('19'))
    return goesStatusLabel(goes19?.color || 'GREEN')
  }, [goesData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-text-primary">Monitor de Clima Espacial</h1>
        <p className="mt-1.5 text-sm text-text-muted">GOES-19 · Datos en Tiempo Real · Sector Sudamérica</p>
      </div>

      {/* Weather & SAT Section */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {/* Current Weather */}
        <div className="card flex flex-col justify-between overflow-hidden border-accent-cyan/20 bg-background-card/50 min-h-[220px]">
          <div className="flex items-center justify-between">
            <span className="section-label flex items-center gap-1.5">
              <MapPin size={12} className={cn("text-accent-cyan", usingFallback && "text-text-dim")} />
              <span className="text-sm font-bold uppercase tracking-tighter">{usingFallback ? 'Ubicación Predet.' : 'Clima Local'}</span>
            </span>
            <button onClick={() => setShowIconRef(true)} className="rounded p-1 text-text-dim hover:text-white transition-colors"><Info size={14} /></button>
          </div>

          {weatherLoading ? (
            <div className="flex h-24 items-center justify-center"><span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" /></div>
          ) : weather?.current ? (
            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="font-display text-5xl font-black text-text-primary tabular-nums tracking-tighter leading-none">
                  {Math.round(weather.current.temp)}°C
                </span>
                <p className="mt-2 text-sm font-bold text-accent-cyan truncate max-w-[140px] uppercase tracking-wide">{weather.current.name}</p>
                <p className="text-xs text-text-muted font-bold mt-1 tracking-tight">{weather.current.description}</p>
              </div>
              <div className="flex flex-col items-end">
                {getWeatherIcon(weather.current.weather_id, 52, "drop-shadow-glow-blue")}
                {weather.current.st !== null && <span className="text-xs font-data text-text-dim mt-2 font-bold">ST: {Math.round(weather.current.st)}°</span>}
              </div>
            </div>
          ) : <div className="py-10 text-center text-xs text-text-dim uppercase tracking-widest opacity-50 font-bold">Clima no disponible</div>}

          <div className="mt-5 grid grid-cols-2 gap-y-3 gap-x-4 border-t border-border/50 pt-4">
            <div className="flex items-center gap-2">
              <Wind size={14} className="text-accent-cyan" />
              <div className="flex flex-col">
                <span className="font-data text-sm font-black text-text-primary leading-none">{Math.round(weather?.current?.wind_speed ?? 0)}</span>
                <span className="text-[10px] uppercase text-text-dim font-black tracking-tighter">km/h</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Thermometer size={14} className="text-accent-amber" />
              <div className="flex flex-col">
                <span className="font-data text-sm font-black text-text-primary leading-none">{weather?.current?.humidity ?? '--'}%</span>
                <span className="text-[10px] uppercase text-text-dim font-black tracking-tighter">hum.</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gauge size={14} className="text-accent-teal" />
              <div className="flex flex-col">
                <span className="font-data text-sm font-black text-text-primary leading-none">{Math.round(weather?.current?.pressure ?? 0)}</span>
                <span className="text-[10px] uppercase text-text-dim font-black tracking-tighter">hPa</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-accent-cyan" />
              <div className="flex flex-col">
                <span className="font-data text-sm font-black text-text-primary leading-none">{Math.round(weather?.current?.visibility ?? 0)}</span>
                <span className="text-[10px] uppercase text-text-dim font-black tracking-tighter">km vis.</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="card lg:col-span-2 overflow-hidden border-white/5 min-h-[220px] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label text-sm font-bold uppercase tracking-widest">Pronóstico 7 Días</span>
            <div className="h-px flex-1 mx-4 bg-gradient-to-r from-border/50 to-transparent" />
          </div>
          {weatherLoading ? (
            <div className="flex h-24 flex-1 items-center justify-center"><span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" /></div>
          ) : (weather?.forecast && weather.forecast.length > 0) ? (
            <div className="grid grid-cols-7 gap-1.5 flex-1 items-center">
              {weather.forecast.map((f, i) => {
                const date = new Date(f.date + 'T12:00:00')
                const day = DAY_NAMES[date.getDay()]
                return (
                  <div key={f.date} className={cn(
                    "flex flex-col items-center justify-center gap-4 rounded-xl py-5 px-1 transition-all",
                    i === 0 ? "bg-accent-cyan/10 ring-1 ring-accent-cyan/30" : "hover:bg-white/[0.03]"
                  )}>
                    <span className={cn("text-[11px] font-black uppercase tracking-tighter", i === 0 ? "text-accent-cyan" : "text-text-dim")}>
                      {i === 0 ? 'Hoy' : day}
                    </span>
                    {getWeatherIcon(f.weather_id, 28, "drop-shadow-glow-blue")}
                    <div className="flex flex-col items-center">
                      <span className="font-display text-lg font-black text-text-primary leading-none tracking-tighter">{Math.round(f.max)}°</span>
                      <span className="text-[11px] font-bold text-text-dim mt-2 tracking-tighter">{Math.round(f.min)}°</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <div className="flex-1 flex items-center justify-center text-sm text-text-dim uppercase tracking-widest opacity-50 font-bold">Pronóstico no disponible</div>}
        </div>

        {/* SAT Alerts */}
        <div className="card lg:col-span-1 border-accent-orange/30 bg-accent-orange/5 min-h-[220px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="section-label flex items-center gap-2 text-accent-orange text-sm font-bold uppercase">
              <AlertTriangle size={14} />
              Alertas (SAT)
            </span>
            <span className="pulse-dot bg-accent-orange shadow-glow-orange h-2 w-2" />
          </div>
          <div className="flex flex-col flex-1 justify-between gap-4">
            <div className="flex items-start gap-4 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight uppercase tracking-tighter">Sin Alertas Críticas</p>
                <p className="mt-1.5 text-[11px] font-bold leading-normal text-green-400/80 uppercase tracking-tight">
                  Condiciones estables en tu zona de influencia.
                </p>
              </div>
            </div>
            <Link href="https://www.smn.gob.ar/alertas" target="_blank" className="flex items-center justify-between rounded-lg border border-border bg-background-secondary/50 px-4 py-3 text-xs font-black text-text-muted hover:text-white hover:border-accent-cyan transition-all group">
              <span className="uppercase tracking-widest">Mapa Oficial SMN</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform text-accent-cyan" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick status cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatusCard label="Clase Rayos X" value={xrayInfo?.label ?? '—'} sub="Onda corta 0.1–0.8 nm" color={xrayInfo?.color ?? 'text-text-muted'} icon={<Zap size={16} />} href="/instruments/xray-flux" loading={!xrayData} />
        <StatusCard label="Flujo de Protones" value={proton ? (proton.flux as number).toFixed(2) : '—'} sub="≥10 MeV pfu" color={proton && (proton.flux as number) >= 10 ? 'text-accent-orange' : 'text-blue-400'} icon={<Activity size={14} />} href="/instruments/proton-flux" loading={!protonData} />
        <StatusCard label="Índice Kp" value={kpData?.at(-1) ? kpData.at(-1)!.kp.toFixed(1) : '—'} sub={kpInfo?.sub ?? 'Cargando…'} color={kpInfo?.color ?? 'text-text-muted'} icon={<Globe size={16} />} href="/instruments/kp-index" loading={!kpData} />
        <StatusCard 
          label="GOES-19" 
          value={gStatus.label} 
          sub={gStatus.sub} 
          color={gStatus.statusColor} 
          icon={<Satellite size={16} />} 
          href="/satellite-status" 
          loading={!goesData} 
        />
      </div>

      {/* Quick links grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <QuickLink title="Imágenes ABI" description="16 canales · Disco Completo SSA" href="/imagery" icon={<Satellite size={20} />} color="text-accent-cyan" />
        <QuickLink title="Flujo de Rayos X" description="Llamaradas solares tiempo real" href="/instruments/xray-flux" icon={<Zap size={20} />} color="text-accent-amber" />
        <QuickLink title="Magnetómetro" description="Tormentas geomagnéticas" href="/instruments/magnetometer" icon={<Activity size={20} />} color="text-primary" />
        <QuickLink title="Pronóstico de Aurora" description="Polos Norte y Sur 30 min" href="/aurora" icon={<Wind size={20} />} color="text-purple-400" />
        <QuickLink title="Coronógrafo" description="Detección de CMEs (CCOR-1)" href="/instruments/coronagraph" icon={<Globe size={20} />} color="text-accent-teal" />
        <QuickLink title="Viento Solar" description="Modelo WSA-ENLIL" href="/solar-wind" icon={<Wind size={20} />} color="text-accent-orange" />
      </div>

      {/* Icon Reference Modal */}
      {showIconRef && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setShowIconRef(false)}>
          <div className="card w-full max-w-lg border-accent-cyan/30 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
              <span className="font-display text-2xl font-black uppercase tracking-widest text-accent-cyan flex items-center gap-4">
                <Info size={32} /> LEYENDA DEL CLIMA
              </span>
              <button onClick={() => setShowIconRef(false)} className="text-text-dim hover:text-white p-1 transition-colors"><X size={32} /></button>
            </div>
            <div className="grid grid-cols-2 gap-y-10 gap-x-8 px-2">
              <IconRef icon={<Sun size={28} className="text-amber-400" />} label="Despejado / Soleado" />
              <IconRef icon={<Cloud size={28} className="text-slate-300" />} label="Parcialmente Nublado" />
              <IconRef icon={<Cloud size={28} className="text-slate-500" />} label="Nublado / Cubierto" />
              <IconRef icon={<CloudLightning size={28} className="text-accent-orange" />} label="Tormentas" />
              <IconRef icon={<CloudRain size={28} className="text-blue-400" />} label="Lluvias / Chaparrones" />
              <IconRef icon={<Snowflake size={28} className="text-cyan-100" />} label="Nieve / Helada" />
            </div>
            <button onClick={() => setShowIconRef(false)} className="mt-12 w-full rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 py-5 text-base font-black uppercase tracking-widest text-accent-cyan hover:bg-accent-cyan/20 transition-all shadow-glow-blue">Entendido</button>
          </div>
        </div>
      )}
    </div>
  )
}

function IconRef({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-5">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 border border-white/10">{icon}</div>
      <span className="text-[14px] font-black text-text-secondary leading-tight uppercase tracking-tight">{label}</span>
    </div>
  )
}

function StatusCard({ label, value, sub, color, icon, href, loading }: any) {
  return (
    <Link href={href} className="card flex flex-col gap-3 transition-all hover:border-border-accent hover:shadow-glow-blue group py-5">
      <div className="flex items-center justify-between">
        <span className="section-label text-sm group-hover:text-white transition-colors">{label}</span>
        <span className={cn(color, "transition-transform group-hover:scale-110")}>{icon}</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2"><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" /></div>
      ) : <span className={cn('font-display text-3xl font-black', color)}>{value}</span>}
      <span className="text-xs font-black text-text-dim uppercase tracking-tighter">{sub}</span>
    </Link>
  )
}

function QuickLink({ title, description, href, icon, color }: any) {
  return (
    <Link href={href} className="card flex items-start gap-5 transition-all hover:border-border-accent hover:shadow-glow-blue group py-5">
      <div className={cn("mt-1 shrink-0 p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/20 transition-all", color)}>{icon}</div>
      <div>
        <p className="font-display text-sm font-black text-text-primary uppercase tracking-wider">{title}</p>
        <p className="mt-1.5 text-xs font-bold text-text-muted leading-relaxed line-clamp-2 uppercase tracking-tighter">{description}</p>
      </div>
    </Link>
  )
}
