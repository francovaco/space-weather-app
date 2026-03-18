// ============================================================
// src/app/api/forecast/alerts/route.ts
// Real-time space weather threshold evaluation
// Fetches live NOAA data and evaluates against NSWPC scales
// ============================================================
import { NextResponse } from 'next/server'
import { instrumentedFetch } from '@/lib/instrumented-fetch'
import { logger } from '@/lib/logger'
import { evaluateAlerts, estimateStormProbability, predictKpRuleBased } from '@/lib/thresholds'
import { classifyXRay } from '@/types/swpc'
import type { CurrentConditions, ForecastResponse } from '@/types/forecast'

const SWPC = 'https://services.swpc.noaa.gov'

// Fetch with timeout, returning null on failure (non-fatal)
async function safeFetch(url: string, route: string): Promise<any | null> {
  const ac = new AbortController()
  const tid = setTimeout(() => ac.abort(), 8000)
  try {
    const res = await instrumentedFetch(url, {
      signal: ac.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'space-weather-app/0.1', 'Accept-Encoding': 'identity' },
    }, route)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(tid)
  }
}

export async function GET() {
  const start = Date.now()

  // Fetch all sources in parallel — failures are tolerated
  const [bzRaw, plasmaRaw, kpRaw, xrayRaw, protonRaw] = await Promise.all([
    safeFetch(`${SWPC}/products/solar-wind/mag-6-hour.json`, 'forecast/bz'),
    safeFetch(`${SWPC}/products/solar-wind/plasma-5-minute.json`, 'forecast/plasma'),
    safeFetch(`${SWPC}/products/noaa-planetary-k-index.json`, 'forecast/kp'),
    safeFetch(`${SWPC}/json/goes/primary/xrays-6-hour.json`, 'forecast/xray'),
    safeFetch(`${SWPC}/json/goes/primary/integral-protons-6-hour.json`, 'forecast/proton'),
  ])

  // ---- Parse DSCOVR Bz (array of arrays) ----
  let bzLast: number | null = null
  let btLast: number | null = null
  let bzSustained: number | null = null
  let bzTime: string | null = null

  if (Array.isArray(bzRaw) && bzRaw.length > 1) {
    const rows = bzRaw.slice(1)
      .map((r: any[]) => ({ time: r[0], bz: parseFloat(r[3]), bt: parseFloat(r[4]) }))
      .filter(d => !isNaN(d.bz) && !isNaN(d.bt))

    if (rows.length > 0) {
      const last = rows[rows.length - 1]
      bzLast = last.bz
      btLast = last.bt
      bzTime = last.time

      // Average last 30 min for sustained Bz
      const cutoff = new Date(Date.now() - 30 * 60 * 1000)
      const recent = rows.filter(r => new Date(r.time) >= cutoff)
      if (recent.length > 0) {
        bzSustained = recent.reduce((sum, r) => sum + r.bz, 0) / recent.length
      }
    }
  }

  // ---- Parse solar wind plasma (array of arrays) ----
  let windSpeed: number | null = null
  let windDensity: number | null = null
  let plasmaTime: string | null = null

  if (Array.isArray(plasmaRaw) && plasmaRaw.length > 1) {
    const rows = plasmaRaw.slice(1)
      .map((r: any[]) => ({ time: r[0], density: parseFloat(r[1]), speed: parseFloat(r[2]) }))
      .filter(d => !isNaN(d.density) && !isNaN(d.speed))

    if (rows.length > 0) {
      const last = rows[rows.length - 1]
      windSpeed = last.speed
      windDensity = last.density
      plasmaTime = last.time
    }
  }

  // ---- Parse Kp (array of arrays) ----
  let kpCurrent: number | null = null
  let kpTime: string | null = null

  if (Array.isArray(kpRaw) && kpRaw.length > 1) {
    const rows = kpRaw.slice(1)
      .map((r: any) => ({ time: r[0], kp: parseFloat(r[1]) }))
      .filter(d => !isNaN(d.kp))

    if (rows.length > 0) {
      const last = rows[rows.length - 1]
      kpCurrent = last.kp
      kpTime = last.time
    }
  }

  // ---- Parse X-ray flux (array of objects) ----
  let xrayFlux: number | null = null
  let xrayClass: string | null = null
  let xrayTime: string | null = null

  if (Array.isArray(xrayRaw) && xrayRaw.length > 0) {
    // Get the long-channel (0.1–0.8nm) flux — used for R-scale
    const longChannel = xrayRaw
      .filter((r: any) => r.energy === '0.1-0.8nm' && typeof r.flux === 'number' && !isNaN(r.flux))
    if (longChannel.length > 0) {
      const last = longChannel[longChannel.length - 1]
      xrayFlux = last.flux
      xrayClass = classifyXRay(last.flux).value
      xrayTime = last.time_tag
    }
  }

  // ---- Parse proton flux ≥10 MeV ----
  let protonFlux10mev: number | null = null
  let protonTime: string | null = null

  if (Array.isArray(protonRaw) && protonRaw.length > 0) {
    const channel10 = protonRaw
      .filter((r: any) => r.energy === '>=10 MeV' && typeof r.flux === 'number' && !isNaN(r.flux))
    if (channel10.length > 0) {
      const last = channel10[channel10.length - 1]
      protonFlux10mev = last.flux
      protonTime = last.time_tag
    }
  }

  // ---- Build conditions object ----
  const conditions: CurrentConditions = {
    bz_last: bzLast,
    bt_last: btLast,
    bz_sustained: bzSustained !== null ? parseFloat(bzSustained.toFixed(2)) : null,
    wind_speed: windSpeed,
    wind_density: windDensity,
    kp_current: kpCurrent,
    xray_flux: xrayFlux,
    xray_class: xrayClass,
    proton_flux_10mev: protonFlux10mev,
    data_times: {
      bz: bzTime,
      plasma: plasmaTime,
      kp: kpTime,
      xray: xrayTime,
      proton: protonTime,
    },
  }

  // ---- Evaluate thresholds ----
  const alerts = evaluateAlerts(conditions)
  const storm_probability = estimateStormProbability(conditions)
  const kp_predictions = predictKpRuleBased(conditions)

  // Estimate data age from most recent reading
  const oldestTime = [bzTime, plasmaTime, kpTime].filter(Boolean)
  let dataAgeMinutes = 0
  if (oldestTime.length > 0) {
    const times = oldestTime.map(t => new Date(t!).getTime()).filter(t => !isNaN(t))
    if (times.length > 0) {
      const maxTime = Math.max(...times)
      dataAgeMinutes = Math.round((Date.now() - maxTime) / 60_000)
    }
  }

  const response: ForecastResponse = {
    generated_at: new Date().toISOString(),
    conditions,
    alerts,
    storm_probability,
    kp_predictions,
    data_age_minutes: dataAgeMinutes,
  }

  logger.info('Forecast alerts generated', {
    route: 'forecast/alerts',
    alert_count: alerts.length,
    kp: kpCurrent,
    bz: bzLast,
    duration_ms: Date.now() - start,
  })

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, max-age=55, s-maxage=60' },
  })
}
