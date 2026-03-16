'use client'
// ============================================================
// src/hooks/useWeatherQuery.ts
// Hook compartido de datos meteorológicos locales.
// Usa TanStack Query con un queryKey basado en lat/lon redondeado
// a 2 decimales (~1 km) para que WeatherPill y DashboardClient
// compartan exactamente el mismo cache y nunca muestren datos distintos.
// ============================================================
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

export interface WeatherCurrent {
  name: string
  temp: number
  description: string
  humidity: number
  st: number | null
  is_day: boolean
  wind_speed: number
  wind_direction: number
  pressure: number
  visibility: number
  weather_id: number
  uv_index: number
  precipitation: number
  sunrise: string
  sunset: string
}

export interface DailyForecast {
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
    gfs: {
      temp: number | null
      wind: number | null
      rain: number | null
      hum: number | null
      pres: number | null
    }
  }
}

export interface WeatherApiData {
  current: WeatherCurrent | null
  forecast: DailyForecast[]
  alerts: any[]
  hasAlerts: boolean
  status: string
}

// Redondea a 2 decimales para estabilizar el queryKey (~1 km de precisión)
function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function useWeatherQuery() {
  const [loc, setLoc] = useState<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    // 1. Carga inmediata desde localStorage
    const savedLat = localStorage.getItem('last_lat')
    const savedLon = localStorage.getItem('last_lon')
    if (savedLat && savedLon) {
      setLoc({ lat: parseFloat(savedLat), lon: parseFloat(savedLon) })
    }

    // 2. Actualización en background desde GPS
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const newLoc = { lat: p.coords.latitude, lon: p.coords.longitude }
        setLoc((prev) => {
          if (
            prev &&
            Math.abs(prev.lat - newLoc.lat) < 0.01 &&
            Math.abs(prev.lon - newLoc.lon) < 0.01
          )
            return prev
          localStorage.setItem('last_lat', newLoc.lat.toString())
          localStorage.setItem('last_lon', newLoc.lon.toString())
          return newLoc
        })
      },
      () => {},
      { timeout: 5000, enableHighAccuracy: false },
    )
  }, [])

  const url = loc
    ? `/api/smn/weather?lat=${loc.lat.toFixed(4)}&lon=${loc.lon.toFixed(4)}`
    : '/api/smn/weather'

  const query = useQuery<WeatherApiData>({
    queryKey: [
      'smn-weather',
      loc ? round2(loc.lat) : null,
      loc ? round2(loc.lon) : null,
    ],
    queryFn: () => fetch(url).then((r) => r.json()),
    staleTime: 55_000,
    refetchInterval: 60_000,
  })

  return { loc, ...query }
}
