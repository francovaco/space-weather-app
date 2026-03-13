// ============================================================
// src/lib/swpc-api.ts — SWPC data fetching functions
// Calls our Next.js API proxy routes (avoids CORS)
// ============================================================

const BASE = '/api/swpc'

/** Generic fetcher with error handling */
async function apiFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(endpoint, {
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`SWPC API error: ${res.status} ${endpoint}`)
  return res.json()
}

// --- Magnetometer ---
export const getMagnetometerData = (range: string = '1-hour', date?: string) =>
  apiFetch(`${BASE}/magnetometer?range=${range}${date ? `&date=${date}` : ''}`)

// --- X-Ray Flux ---
export const getXRayFluxData = (range: string = '1-hour') =>
  apiFetch(`${BASE}/xray-flux?range=${range}`)

// --- Electron Flux ---
export const getElectronFluxData = (range: string = '1-hour') =>
  apiFetch(`${BASE}/electron-flux?range=${range}`)

// --- Proton Flux ---
export const getProtonFluxData = (range: string = '1-hour') =>
  apiFetch(`${BASE}/proton-flux?range=${range}`)

// --- Aurora ---
export const getAuroraForecast = () =>
  apiFetch(`${BASE}/aurora`)

export const getAuroraFrames = (pole: 'north' | 'south') =>
  apiFetch(`${BASE}/aurora?pole=${pole}`)

// --- Solar Wind (WSA-ENLIL) ---
export const getSolarWindFrames = () =>
  apiFetch(`${BASE}/solar-wind`)

// --- Solar Synoptic Map ---
export const getSolarSynopticMap = () =>
  apiFetch(`${BASE}/solar-synoptic`)

// --- Coronagraph frames ---
export const getCoronagraphFrames = (source: string) =>
  apiFetch(`${BASE}/coronagraph?source=${source}`)

// --- SUVI frames ---
export const getSuviFrames = (wavelength: string) =>
  apiFetch(`${BASE}/suvi?wavelength=${wavelength}`)

// --- D-RAP (D-Region Absorption Predictions) ---
export const getDRAPFrames = (view: 'global' | 'north-pole' | 'south-pole') =>
  apiFetch(`${BASE}/d-rap?view=${view}`)

// --- WAM-IPE (Whole Atmosphere Model - Ionosphere Plasmasphere Electrodynamics) ---
export const getWAMIPEFrames = (view: 'neutral-nowcast' | 'ionosphere-nowcast' | 'neutral-forecast' | 'ionosphere-forecast') =>
  apiFetch(`${BASE}/wam-ipe?view=${view}`)

// --- Geospace Magnetosphere Movies ---
export const getMagnetosphereFrames = (type: 'density' | 'pressure' | 'velocity') =>
  apiFetch(`${BASE}/magnetosphere?type=${type}`)

// --- GloTEC (Global Total Electron Content) ---
export const getGLOTECFrames = (view: 'atlantic' | 'pacific', type: 'tec' | 'anomaly' | 'ray' = 'tec') =>
  apiFetch(`${BASE}/glotec?view=${view}&type=${type}`)

// --- CTIPe (Coupled Thermosphere Ionosphere Plasmasphere Electrodynamics Model) ---
export const getCTIPEFrames = () =>
  apiFetch(`${BASE}/ctipe`)

// --- Kp Index ---
export const getKpIndexData = (date?: string) =>
  apiFetch(`${BASE}/kp-index${date ? `?date=${date}` : ''}`)

/** 
 * Map UI time range to SWPC API range string
 * SWPC endpoints use: 1-hour, 6-hour, 1-day, 3-day, 7-day
 */
export function timeRangeToParam(range: string): string {
  const map: Record<string, string> = {
    '6h': '6-hour',
    '1d': '1-day',
    '3d': '3-day',
    '7d': '7-day',
  }
  return map[range] ?? '1-day'
}

const SWPC_BASE = process.env.NEXT_PUBLIC_SWPC_SERVICES || 'https://services.swpc.noaa.gov'

/** 
 * SWPC real-time JSON endpoints (called from API routes server-side)
 * Exported for use in Next.js API route handlers
 */
export const SWPC_ENDPOINTS = {
  // Magnetometer — updates every 1 min
  magnetometer1h: `${SWPC_BASE}/json/goes/primary/magnetometers-1-hour.json`,
  magnetometer6h: `${SWPC_BASE}/json/goes/primary/magnetometers-6-hour.json`,
  magnetometer1d: `${SWPC_BASE}/json/goes/primary/magnetometers-1-day.json`,
  magnetometer3d: `${SWPC_BASE}/json/goes/primary/magnetometers-3-day.json`,
  magnetometer7d: `${SWPC_BASE}/json/goes/primary/magnetometers-7-day.json`,

  // X-Ray Flux — updates every 1 min
  xray1h: `${SWPC_BASE}/json/goes/primary/xrays-1-hour.json`,
  xray6h: `${SWPC_BASE}/json/goes/primary/xrays-6-hour.json`,
  xray1d: `${SWPC_BASE}/json/goes/primary/xrays-1-day.json`,
  xray3d: `${SWPC_BASE}/json/goes/primary/xrays-3-day.json`,
  xray7d: `${SWPC_BASE}/json/goes/primary/xrays-7-day.json`,

  // Electron Flux — updates every 5 min
  electrons1h: `${SWPC_BASE}/json/goes/primary/integral-electrons-1-hour.json`,
  electrons6h: `${SWPC_BASE}/json/goes/primary/integral-electrons-6-hour.json`,
  electrons1d: `${SWPC_BASE}/json/goes/primary/integral-electrons-1-day.json`,
  electrons3d: `${SWPC_BASE}/json/goes/primary/integral-electrons-3-day.json`,
  electrons7d: `${SWPC_BASE}/json/goes/primary/integral-electrons-7-day.json`,

  // Proton Flux — updates every 5 min
  protons1h: `${SWPC_BASE}/json/goes/primary/integral-protons-1-hour.json`,
  protons6h: `${SWPC_BASE}/json/goes/primary/integral-protons-6-hour.json`,
  protons1d: `${SWPC_BASE}/json/goes/primary/integral-protons-1-day.json`,
  protons3d: `${SWPC_BASE}/json/goes/primary/integral-protons-3-day.json`,
  protons7d: `${SWPC_BASE}/json/goes/primary/integral-protons-7-day.json`,

  // Aurora ovation — updates every 5 min
  aurora: `${SWPC_BASE}/json/ovation_aurora_latest.json`,

  // Kp index
  kp1h: `${SWPC_BASE}/json/goes/primary/estimated-planetary-k-index-1-hour.json`,
} as const
