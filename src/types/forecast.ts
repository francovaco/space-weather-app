// ============================================================
// src/types/forecast.ts — Space weather forecast types
// ============================================================

export type AlertSeverity = 'info' | 'watch' | 'warning' | 'alert'
export type AlertCategory = 'geomagnetic' | 'radiation' | 'radio' | 'solar_flare' | 'solar_wind'

export interface ForecastAlert {
  id: string
  category: AlertCategory
  severity: AlertSeverity
  title: string
  description: string
  value: number
  threshold: number
  unit: string
  triggeredAt: string
}

export interface CurrentConditions {
  bz_last: number | null          // IMF Bz component (nT) — most recent
  bt_last: number | null          // IMF total magnitude (nT)
  bz_sustained: number | null     // Bz average over last 30 min (nT)
  wind_speed: number | null       // Solar wind speed (km/s)
  wind_density: number | null     // Solar wind proton density (p/cm³)
  kp_current: number | null       // Most recent Kp index
  xray_flux: number | null        // X-ray flux 0.1–0.8nm (W/m²)
  xray_class: string | null       // Flare class string e.g. "M2.4"
  proton_flux_10mev: number | null // Integral proton flux ≥10 MeV (pfu)
  data_times: {
    bz: string | null
    plasma: string | null
    kp: string | null
    xray: string | null
    proton: string | null
  }
}

export interface StormProbability {
  g1_or_above: number   // G1+ geomagnetic storm probability (0–100)
  g2_or_above: number   // G2+ probability
  g3_or_above: number   // G3+ probability
  r1_or_above: number   // R1+ radio blackout probability (0–100)
  s1_or_above: number   // S1+ solar radiation storm probability (0–100)
}

export type KpPredictionMethod = 'lstm' | 'rule_based'

export interface KpPrediction {
  horizon_hours: number
  predicted_kp: number
  confidence: number       // 0–1
  method: KpPredictionMethod
}

export interface ForecastResponse {
  generated_at: string
  conditions: CurrentConditions
  alerts: ForecastAlert[]
  storm_probability: StormProbability
  kp_predictions: KpPrediction[]
  data_age_minutes: number
}

// G-scale labels
export const GEOMAGNETIC_SCALE: Record<string, { label: string; color: string; kpMin: number }> = {
  G0: { label: 'Ninguna', color: '#4ade80', kpMin: 0 },
  G1: { label: 'Menor', color: '#facc15', kpMin: 5 },
  G2: { label: 'Moderada', color: '#fb923c', kpMin: 6 },
  G3: { label: 'Fuerte', color: '#f87171', kpMin: 7 },
  G4: { label: 'Severa', color: '#c084fc', kpMin: 8 },
  G5: { label: 'Extrema', color: '#e879f9', kpMin: 9 },
}

export function kpToGScale(kp: number): string {
  if (kp >= 9) return 'G5'
  if (kp >= 8) return 'G4'
  if (kp >= 7) return 'G3'
  if (kp >= 6) return 'G2'
  if (kp >= 5) return 'G1'
  return 'G0'
}
