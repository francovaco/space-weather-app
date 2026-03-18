// ============================================================
// src/lib/thresholds.ts — NOAA space weather threshold evaluation
// Based on official NOAA Space Weather Scales (NSWPC)
// ============================================================
import type { ForecastAlert, StormProbability, CurrentConditions, KpPrediction } from '@/types/forecast'

// ---- NOAA official thresholds --------------------------------

// Geomagnetic Storm Scale (G)  — driven by Kp and sustained Bz
const BZ_MODERATE = -5     // nT — G1 precursor
const BZ_STRONG = -10      // nT — G2+ conditions likely
const BZ_SEVERE = -20      // nT — G4+ conditions likely

// Solar Radiation Storm Scale (S) — ≥10 MeV integral proton flux (pfu)
const PROTON_S1 = 10        // S1 — minor
const PROTON_S2 = 100       // S2 — moderate
const PROTON_S3 = 1_000     // S3 — strong
const PROTON_S4 = 10_000    // S4 — severe

// Radio Blackout Scale (R) — X-ray peak flux (W/m²) 0.1–0.8 nm
const XRAY_R1 = 1e-5        // M1 class — R1
const XRAY_R2 = 5e-5        // M5 class — R2
const XRAY_R3 = 1e-4        // X1 class — R3
const XRAY_R4 = 1e-3        // X10 class — R4

// Solar wind speed (km/s)
const WIND_HIGH = 500       // Enhanced solar wind
const WIND_VERY_HIGH = 700  // High-speed stream / CME arrival

// ---- Alert evaluation ----------------------------------------

export function evaluateAlerts(cond: CurrentConditions): ForecastAlert[] {
  const alerts: ForecastAlert[] = []
  const now = new Date().toISOString()

  // --- Bz southward (geomagnetic storm driver) ---
  const bzCheck = cond.bz_sustained ?? cond.bz_last
  if (bzCheck !== null) {
    if (bzCheck <= BZ_SEVERE) {
      alerts.push({
        id: 'bz-severe',
        category: 'geomagnetic',
        severity: 'alert',
        title: 'IMF Bz muy negativo sostenido',
        description: `Bz = ${bzCheck.toFixed(1)} nT (umbral: ${BZ_SEVERE} nT). Condiciones para tormenta geomagnética G4–G5 si persiste.`,
        value: bzCheck,
        threshold: BZ_SEVERE,
        unit: 'nT',
        triggeredAt: now,
      })
    } else if (bzCheck <= BZ_STRONG) {
      alerts.push({
        id: 'bz-strong',
        category: 'geomagnetic',
        severity: 'warning',
        title: 'IMF Bz negativo fuerte',
        description: `Bz = ${bzCheck.toFixed(1)} nT (umbral: ${BZ_STRONG} nT). Posible tormenta G2–G3 si se mantiene durante 1–3 horas.`,
        value: bzCheck,
        threshold: BZ_STRONG,
        unit: 'nT',
        triggeredAt: now,
      })
    } else if (bzCheck <= BZ_MODERATE) {
      alerts.push({
        id: 'bz-moderate',
        category: 'geomagnetic',
        severity: 'watch',
        title: 'IMF Bz negativo moderado',
        description: `Bz = ${bzCheck.toFixed(1)} nT. El campo interplanetario está orientado al sur. Monitorear evolución.`,
        value: bzCheck,
        threshold: BZ_MODERATE,
        unit: 'nT',
        triggeredAt: now,
      })
    }
  }

  // --- Kp (active geomagnetic conditions) ---
  if (cond.kp_current !== null) {
    const kp = cond.kp_current
    if (kp >= 7) {
      alerts.push({
        id: 'kp-strong',
        category: 'geomagnetic',
        severity: 'alert',
        title: `Tormenta Geomagnética G${kp >= 9 ? '5' : kp >= 8 ? '4' : '3'}`,
        description: `Kp = ${kp.toFixed(1)}. Posibles interrupciones en redes eléctricas, comunicaciones HF y sistemas GPS. Auroras visibles en latitudes medias.`,
        value: kp,
        threshold: 7,
        unit: 'Kp',
        triggeredAt: now,
      })
    } else if (kp >= 5) {
      alerts.push({
        id: 'kp-minor',
        category: 'geomagnetic',
        severity: 'watch',
        title: `Tormenta Geomagnética G${kp >= 6 ? '2' : '1'}`,
        description: `Kp = ${kp.toFixed(1)}. Actividad geomagnética elevada. Posibles variaciones en orientación de satélites y auroras en latitudes altas.`,
        value: kp,
        threshold: 5,
        unit: 'Kp',
        triggeredAt: now,
      })
    }
  }

  // --- X-ray flux (solar flare / radio blackout) ---
  if (cond.xray_flux !== null) {
    const flux = cond.xray_flux
    if (flux >= XRAY_R4) {
      alerts.push({
        id: 'xray-r4',
        category: 'solar_flare',
        severity: 'alert',
        title: `Llamarada Solar ${cond.xray_class ?? 'X10+'} — Radio R4`,
        description: `Flujo X = ${flux.toExponential(1)} W/m². Interrupción severa de radio HF en la cara iluminada de la Tierra. Posible degradación de señales GPS.`,
        value: flux,
        threshold: XRAY_R4,
        unit: 'W/m²',
        triggeredAt: now,
      })
    } else if (flux >= XRAY_R3) {
      alerts.push({
        id: 'xray-r3',
        category: 'solar_flare',
        severity: 'warning',
        title: `Llamarada Solar ${cond.xray_class ?? 'X1+'} — Radio R3`,
        description: `Flujo X = ${flux.toExponential(1)} W/m². Interrupción amplia de radio HF. Degradación de señales GPS.`,
        value: flux,
        threshold: XRAY_R3,
        unit: 'W/m²',
        triggeredAt: now,
      })
    } else if (flux >= XRAY_R2) {
      alerts.push({
        id: 'xray-r2',
        category: 'radio',
        severity: 'warning',
        title: `Llamarada Solar ${cond.xray_class ?? 'M5+'} — Radio R2`,
        description: `Flujo X = ${flux.toExponential(1)} W/m². Pérdida limitada de radio HF en la cara iluminada.`,
        value: flux,
        threshold: XRAY_R2,
        unit: 'W/m²',
        triggeredAt: now,
      })
    } else if (flux >= XRAY_R1) {
      alerts.push({
        id: 'xray-r1',
        category: 'radio',
        severity: 'watch',
        title: `Llamarada Solar ${cond.xray_class ?? 'M1+'} — Radio R1`,
        description: `Flujo X = ${flux.toExponential(1)} W/m². Débil degradación de radio HF en frecuencias más altas (cara diurna).`,
        value: flux,
        threshold: XRAY_R1,
        unit: 'W/m²',
        triggeredAt: now,
      })
    }
  }

  // --- Proton flux (solar radiation storm) ---
  if (cond.proton_flux_10mev !== null) {
    const pfu = cond.proton_flux_10mev
    if (pfu >= PROTON_S4) {
      alerts.push({
        id: 'proton-s4',
        category: 'radiation',
        severity: 'alert',
        title: 'Tormenta de Radiación Solar S4',
        description: `Flujo de protones ≥10 MeV = ${pfu.toFixed(0)} pfu. Daños a satélites en órbita polar. Interrupciones en HF polar. Alto riesgo de dosis de radiación para vuelos polares.`,
        value: pfu,
        threshold: PROTON_S4,
        unit: 'pfu',
        triggeredAt: now,
      })
    } else if (pfu >= PROTON_S3) {
      alerts.push({
        id: 'proton-s3',
        category: 'radiation',
        severity: 'alert',
        title: 'Tormenta de Radiación Solar S3',
        description: `Flujo de protones ≥10 MeV = ${pfu.toFixed(0)} pfu. Dosis de radiación elevada en vuelos polares. Posibles fallas en electrónica de satélites.`,
        value: pfu,
        threshold: PROTON_S3,
        unit: 'pfu',
        triggeredAt: now,
      })
    } else if (pfu >= PROTON_S2) {
      alerts.push({
        id: 'proton-s2',
        category: 'radiation',
        severity: 'warning',
        title: 'Tormenta de Radiación Solar S2',
        description: `Flujo de protones ≥10 MeV = ${pfu.toFixed(0)} pfu. Interrupción de radio polar. Posibles anomalías en satélites en órbita polar.`,
        value: pfu,
        threshold: PROTON_S2,
        unit: 'pfu',
        triggeredAt: now,
      })
    } else if (pfu >= PROTON_S1) {
      alerts.push({
        id: 'proton-s1',
        category: 'radiation',
        severity: 'watch',
        title: 'Tormenta de Radiación Solar S1',
        description: `Flujo de protones ≥10 MeV = ${pfu.toFixed(0)} pfu. Degradación menor de navegación de alta latitud.`,
        value: pfu,
        threshold: PROTON_S1,
        unit: 'pfu',
        triggeredAt: now,
      })
    }
  }

  // --- Solar wind speed ---
  if (cond.wind_speed !== null) {
    if (cond.wind_speed >= WIND_VERY_HIGH) {
      alerts.push({
        id: 'wind-very-high',
        category: 'solar_wind',
        severity: 'warning',
        title: 'Velocidad del Viento Solar Muy Alta',
        description: `Velocidad = ${cond.wind_speed.toFixed(0)} km/s (umbral: ${WIND_VERY_HIGH} km/s). Posible corriente de alta velocidad (HSS) o CME. Mayor probabilidad de tormenta geomagnética.`,
        value: cond.wind_speed,
        threshold: WIND_VERY_HIGH,
        unit: 'km/s',
        triggeredAt: now,
      })
    } else if (cond.wind_speed >= WIND_HIGH) {
      alerts.push({
        id: 'wind-high',
        category: 'solar_wind',
        severity: 'watch',
        title: 'Velocidad del Viento Solar Elevada',
        description: `Velocidad = ${cond.wind_speed.toFixed(0)} km/s (umbral: ${WIND_HIGH} km/s). Corriente de viento solar mejorada.`,
        value: cond.wind_speed,
        threshold: WIND_HIGH,
        unit: 'km/s',
        triggeredAt: now,
      })
    }
  }

  return alerts
}

// ---- Storm probability estimation ----------------------------
// Heuristic model based on NOAA thresholds and empirical data

export function estimateStormProbability(cond: CurrentConditions): StormProbability {
  const bz = cond.bz_sustained ?? cond.bz_last ?? 0
  const kp = cond.kp_current ?? 0
  const windSpeed = cond.wind_speed ?? 400
  const xray = cond.xray_flux ?? 0
  const proton = cond.proton_flux_10mev ?? 0

  // G1+ probability (0–100)
  // Driven by: Bz southward, Kp already elevated, wind speed
  let g1Score = 0
  if (bz < -5) g1Score += 20
  if (bz < -10) g1Score += 30
  if (bz < -20) g1Score += 30
  if (kp >= 4) g1Score += 15
  if (kp >= 5) g1Score += 20
  if (windSpeed > 500) g1Score += 10
  if (windSpeed > 700) g1Score += 10
  const g1 = Math.min(Math.round(g1Score), 99)

  // G2+ probability (subset of G1+)
  let g2Score = 0
  if (bz < -10) g2Score += 25
  if (bz < -15) g2Score += 25
  if (bz < -20) g2Score += 25
  if (kp >= 5) g2Score += 10
  if (kp >= 6) g2Score += 20
  if (windSpeed > 600) g2Score += 10
  const g2 = Math.min(Math.round(g2Score), g1)

  // G3+ probability
  let g3Score = 0
  if (bz < -15) g3Score += 20
  if (bz < -20) g3Score += 30
  if (kp >= 6) g3Score += 10
  if (kp >= 7) g3Score += 20
  const g3 = Math.min(Math.round(g3Score), g2)

  // R1+ radio blackout probability (driven by X-ray)
  let r1Score = 0
  if (xray >= XRAY_R1 / 2) r1Score += 20   // approaching M1
  if (xray >= XRAY_R1) r1Score += 40         // M1+
  if (xray >= XRAY_R2) r1Score += 25         // M5+
  const r1 = Math.min(Math.round(r1Score), 99)

  // S1+ radiation storm probability (driven by proton flux)
  let s1Score = 0
  if (proton >= PROTON_S1 / 2) s1Score += 15
  if (proton >= PROTON_S1) s1Score += 40
  if (proton >= PROTON_S2) s1Score += 25
  // Flares can drive proton events with ~1-2h lag
  if (xray >= XRAY_R3) s1Score += 20
  const s1 = Math.min(Math.round(s1Score), 99)

  return { g1_or_above: g1, g2_or_above: g2, g3_or_above: g3, r1_or_above: r1, s1_or_above: s1 }
}

// ---- Rule-based Kp predictions (Stage 1 fallback) ------------
// Uses current Bz, solar wind speed, and Kp trend

export function predictKpRuleBased(cond: CurrentConditions): KpPrediction[] {
  const bz = cond.bz_sustained ?? cond.bz_last ?? 0
  const windSpeed = cond.wind_speed ?? 400
  const kpNow = cond.kp_current ?? 1

  // Simple Burton-McPherron-Russell style estimate (simplified)
  // dKp/dt ~ f(Bz, Vx)
  // Epsilon coupling: E = V * Bt * sin²(theta/2) where theta = clock angle
  // For simplicity: delta_kp ~ -bz * 0.15 when bz < 0

  function estimateKpAtHorizon(hours: number): number {
    let predicted = kpNow
    if (bz < 0) {
      // Injection rate scales with |Bz| and wind speed
      const injectionRate = Math.abs(bz) * (windSpeed / 400) * 0.1
      // Saturation + decay
      const maxKpFromBz = Math.min(9, 1 + Math.abs(bz) * 0.25 * (windSpeed / 400))
      predicted = kpNow + injectionRate * Math.sqrt(hours) * (maxKpFromBz > kpNow ? 1 : -0.3)
    } else {
      // Bz positive → recovery phase
      predicted = kpNow * Math.exp(-hours * 0.15)
    }
    return Math.max(0, Math.min(9, parseFloat(predicted.toFixed(1))))
  }

  return [
    { horizon_hours: 1, predicted_kp: estimateKpAtHorizon(1), confidence: 0.70, method: 'rule_based' },
    { horizon_hours: 3, predicted_kp: estimateKpAtHorizon(3), confidence: 0.55, method: 'rule_based' },
    { horizon_hours: 6, predicted_kp: estimateKpAtHorizon(6), confidence: 0.40, method: 'rule_based' },
  ]
}

// Keep threshold constants exported for use in UI
export const THRESHOLDS = {
  BZ_MODERATE, BZ_STRONG, BZ_SEVERE,
  PROTON_S1, PROTON_S2, PROTON_S3, PROTON_S4,
  XRAY_R1, XRAY_R2, XRAY_R3, XRAY_R4,
  WIND_HIGH, WIND_VERY_HIGH,
} as const
