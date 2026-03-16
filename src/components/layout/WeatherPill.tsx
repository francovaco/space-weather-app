'use client'
// ============================================================
// src/components/layout/WeatherPill.tsx
// Pastilla de clima en el TopBar — usa useWeatherQuery para
// compartir cache con DashboardClient y mostrar siempre el mismo dato.
// ============================================================
import { Cloud, CloudRain, Sun, MapPin, CloudLightning, Snowflake, AlertTriangle, CloudSun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWeatherQuery } from '@/hooks/useWeatherQuery'

function getWeatherIcon(code: number, size = 12, className = '') {
  if (code === 0) return <Sun size={size} className={cn('text-amber-400', className)} />
  if (code === 1 || code === 2) return <CloudSun size={size} className={cn('text-sky-300', className)} />
  if (code === 3 || (code >= 45 && code <= 48)) return <Cloud size={size} className={cn('text-slate-400', className)} />
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return <Snowflake size={size} className={cn('text-white', className)} />
  if (code >= 51 && code <= 82) return <CloudRain size={size} className={cn('text-blue-400', className)} />
  return <CloudLightning size={size} className={cn('text-orange-500', className)} />
}

export function WeatherPill() {
  const { data: weather, isLoading } = useWeatherQuery()

  if (isLoading && !weather) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-border bg-background-card px-3 py-1 animate-pulse">
        <div className="h-3 w-3 rounded-full bg-border" />
        <div className="h-3 w-12 rounded bg-border" />
      </div>
    )
  }

  if (!weather?.current) return null

  return (
    <div className="flex items-center gap-3 rounded-full border border-border bg-background-card px-3 py-1 shadow-sm transition-all hover:border-border-accent group">
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/40 border transition-all',
          weather.hasAlerts
            ? 'border-red-500/50 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
            : 'border-green-500/50 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]',
        )}
      >
        <AlertTriangle size={14} className={cn('shrink-0', weather.hasAlerts && 'animate-pulse')} />
      </div>

      <div className="h-3 w-px bg-border" />

      <div className="flex items-center gap-1.5 text-text-muted w-24">
        <MapPin size={10} className="text-accent-cyan shrink-0" />
        <div className="marquee-container flex-1">
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
