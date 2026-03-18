// ============================================================
// src/lib/forecast-api.ts — Client fetchers for forecast endpoints
// ============================================================
import type { ForecastResponse, KpPrediction } from '@/types/forecast'

export async function getForecastAlerts(): Promise<ForecastResponse> {
  const res = await fetch('/api/forecast/alerts', { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`Forecast API error: ${res.status}`)
  return res.json()
}

export interface KpPredictionServiceResponse {
  available: boolean
  predictions?: KpPrediction[]
  model_version?: string
  trained_at?: string
  error?: string
}

export async function getKpPrediction(): Promise<KpPredictionServiceResponse> {
  try {
    const res = await fetch('/api/forecast/kp-prediction', { next: { revalidate: 60 } })
    if (res.status === 503 || res.status === 502) {
      return { available: false }
    }
    if (!res.ok) return { available: false }
    return res.json()
  } catch {
    return { available: false }
  }
}
