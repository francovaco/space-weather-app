'use client'
import { useState, useEffect } from 'react'
import { Cloud, CloudRain, Sun, MapPin, CloudLightning, Snowflake, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WeatherData {
  current: {
    name: string
    temp: number
    description: string
    st: number | null
    weather_id: number
  } | null
  hasAlerts: boolean
}

function getWeatherIcon(code: number, size = 12, className = "") {
  if (code === 0) return <Sun size={size} className={cn("text-amber-400", className)} />
  if (code <= 3) return <Cloud size={size} className={cn("text-slate-300", className)} />
  if (code >= 45 && code <= 48) return <Cloud size={size} className={cn("text-slate-500", className)} />
  if (code >= 51 && code <= 67) return <CloudRain size={size} className={cn("text-blue-400", className)} />
  if (code >= 71 && code <= 77) return <Snowflake size={size} className={cn("text-cyan-100", className)} />
  if (code >= 80 && code <= 82) return <CloudRain size={size} className={cn("text-blue-500", className)} />
  if (code >= 95) return <CloudLightning size={size} className={cn("text-accent-orange", className)} />
  return <Cloud size={size} className={cn("text-text-muted", className)} />
}

export function WeatherPill() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let currentLat: number | undefined
    let currentLon: number | undefined

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
            localStorage.setItem('last_lat', lat.toString())
            localStorage.setItem('last_lon', lon.toString())
          }
        }
      } catch (err) {
        console.error('WeatherPill fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    // 1. Proactive Load from localStorage
    const savedLat = localStorage.getItem('last_lat')
    const savedLon = localStorage.getItem('last_lon')

    if (savedLat && savedLon) {
      currentLat = parseFloat(savedLat)
      currentLon = parseFloat(savedLon)
      fetchWeather(currentLat, currentLon)
    } else {
      fetchWeather() // IP Fallback
    }

    // 2. Background Update from GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = pos.coords.latitude
          const newLon = pos.coords.longitude
          if (!currentLat || Math.abs(currentLat - newLat) > 0.01) {
            fetchWeather(newLat, newLon)
          }
        },
        () => {
          if (!weather) fetchWeather()
        },
        { timeout: 5000, enableHighAccuracy: false }
      )
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-border bg-background-card px-3 py-1 animate-pulse">
        <div className="h-3 w-3 rounded-full bg-border" />
        <div className="h-3 w-12 rounded bg-border" />
      </div>
    )
  }

  if (!weather || !weather.current) return null

  return (
    <div className="flex items-center gap-3 rounded-full border border-border bg-background-card px-3 py-1 shadow-sm transition-all hover:border-border-accent group">
      {/* Alert Icon - Centered and resized for better fit */}
      <div className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/40 border transition-all",
        weather.hasAlerts ? "border-red-500/50 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" : "border-green-500/50 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
      )}>
        <AlertTriangle size={14} className={cn("shrink-0", weather.hasAlerts && "animate-pulse")} />
      </div>

      <div className="h-3 w-px bg-border" />

      <div className="flex items-center gap-1.5 text-text-muted min-w-0 max-w-[100px]">
        <MapPin size={10} className="text-accent-cyan shrink-0" />
        <div className="marquee-container">
          <span className="marquee-content text-[10px] font-black uppercase tracking-widest font-display">
            {weather.current.name}
          </span>
        </div>
      </div>
      
      <div className="h-3 w-px bg-border" />

      <div className="flex items-center gap-2">
        {getWeatherIcon(weather.current.weather_id, 14)}
        <div className="flex items-baseline gap-0.5">
          <span className="font-display text-xs font-black text-text-primary tabular-nums leading-none">
            {Math.round(weather.current.temp)}
          </span>
          <span className="text-[9px] font-black text-text-dim leading-none">°C</span>
        </div>
      </div>
    </div>
  )
}
