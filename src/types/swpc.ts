// ============================================================
// src/types/swpc.ts — SWPC space weather data types
// ============================================================

// --- Magnetometer ---

export interface MagnetometerReading {
  time_tag: string
  satellite: number
  Hp: number   // H+ component (nT)
  He: number   // H-e component (nT)
  Hn: number   // H-n component (nT)
  total: number // Total field (nT)
  arcjet_flag: number
}

export type MagnetometerData = MagnetometerReading[]

// --- X-Ray Flux ---

export interface XRayReading {
  time_tag: string
  satellite: number
  flux: number
  observed_flux: number
  electron_correction: number
  electron_contaminaton: boolean
  energy: '0.05-0.4nm' | '0.1-0.8nm' // short (0.05–0.4 nm) | long (0.1–0.8 nm)
}

export type XRayData = XRayReading[]

export type XRayClass = 'A' | 'B' | 'C' | 'M' | 'X'

export function classifyXRay(flux: number): { cls: XRayClass; value: string } {
  if (flux >= 1e-4) return { cls: 'X', value: `X${(flux / 1e-4).toFixed(1)}` }
  if (flux >= 1e-5) return { cls: 'M', value: `M${(flux / 1e-5).toFixed(1)}` }
  if (flux >= 1e-6) return { cls: 'C', value: `C${(flux / 1e-6).toFixed(1)}` }
  if (flux >= 1e-7) return { cls: 'B', value: `B${(flux / 1e-7).toFixed(1)}` }
  return { cls: 'A', value: `A${(flux / 1e-8).toFixed(1)}` }
}

// --- Electron Flux ---

export interface ElectronFluxReading {
  time_tag: string
  satellite: number
  electron_flux: number
  energy: '>2 MeV' | '>4 MeV'
}

export type ElectronFluxData = ElectronFluxReading[]

// --- Proton Flux ---

export interface ProtonFluxReading {
  time_tag: string
  satellite: number
  flux: number
  energy: '>10 MeV' | '>50 MeV' | '>100 MeV' | '>500 MeV'
  observed_flux: number
}

export type ProtonFluxData = ProtonFluxReading[]

// --- SUVI (Solar Ultraviolet Imager) ---

export type SUVIWavelength = '094' | '131' | '171' | '195' | '284' | '304'

export interface SUVIWavelengthInfo {
  angstroms: SUVIWavelength
  label: string
  temperature: string
  feature: string
  color: string
}

export const SUVI_WAVELENGTHS: SUVIWavelengthInfo[] = [
  {
    angstroms: '094',
    label: '94 Å',
    temperature: '~6.3 MK',
    feature: 'Llamaradas solares, regiones activas calientes',
    color: '#ff4444',
  },
  {
    angstroms: '131',
    label: '131 Å',
    temperature: '~10 MK',
    feature: 'Cintas de llamaradas, bucles post-llamarada',
    color: '#ff8800',
  },
  {
    angstroms: '171',
    label: '171 Å',
    temperature: '~0.63 MK',
    feature: 'Corona tranquila, bucles coronales',
    color: '#ffcc44',
  },
  {
    angstroms: '195',
    label: '195 Å',
    temperature: '~1.5 MK',
    feature: 'Regiones activas, CMEs',
    color: '#44ff88',
  },
  {
    angstroms: '284',
    label: '284 Å',
    temperature: '~2 MK',
    feature: 'Hoyos coronales, regiones activas',
    color: '#44aaff',
  },
  {
    angstroms: '304',
    label: '304 Å',
    temperature: '~0.05 MK',
    feature: 'Cromosfera, protuberancias, filamentos',
    color: '#ff44cc',
  },
]

// --- Coronagraph ---

export type CoronagraphSource = 'GOES-CCOR-1' | 'GOES-CCOR-1-DIFF' | 'LASCO-C2' | 'LASCO-C3'

export interface CoronagraphInfo {
  id: CoronagraphSource
  label: string
  description: string
  fieldOfView: string
  operator: string
}

export const CORONAGRAPH_SOURCES: CoronagraphInfo[] = [
  {
    id: 'GOES-CCOR-1',
    label: 'GOES CCOR-1',
    description: 'Coronógrafo Compacto 1 a bordo del GOES-19',
    fieldOfView: '3.0–17.5 R☉',
    operator: 'NOAA',
  },
  {
    id: 'GOES-CCOR-1-DIFF',
    label: 'GOES CCOR-1 Diferencial',
    description: 'Imágenes diferenciales — resalta el movimiento de CMEs',
    fieldOfView: '3.0–17.5 R☉',
    operator: 'NOAA',
  },
  {
    id: 'LASCO-C2',
    label: 'LASCO C2',
    description: 'Coronógrafo de Gran Ángulo y Espectroscópico a bordo del SOHO',
    fieldOfView: '1.5–6 R☉',
    operator: 'ESA/NASA',
  },
  {
    id: 'LASCO-C3',
    label: 'LASCO C3',
    description: 'Coronógrafo de campo amplio a bordo del SOHO',
    fieldOfView: '3.7–32 R☉',
    operator: 'ESA/NASA',
  },
]

// --- Aurora ---

export interface AuroraForecastPoint {
  lat: number
  lon: number
  aurora: number // 0–100 probability
}

export type AuroraPole = 'north' | 'south'

// --- Solar Wind (WSA-ENLIL) ---

export interface SolarWindFrame {
  url: string
  timestamp: Date
  model: 'WSA-ENLIL'
}

// --- Kp / Geomagnetic ---

export interface KpReading {
  time_tag: string
  kp: number
  kp_fraction: number
  a_running: number
  station_count: number
}

export type KpIndexData = KpReading[]

// --- GOES Status ---

export interface SatelliteStatusRow {
  name: string
  role: string
  color: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLUE' | 'UNKNOWN'
}

export interface GOESStatusData {
  fetchedAt: string
  satellites: SatelliteStatusRow[]
  anomalies: any[]
  sourceUrl: string
}

// --- Common ---

export type TimeRange = '6h' | '1d' | '3d' | '7d' | 'historical'

export interface TimeRangeOption {
  value: TimeRange
  label: string
  hours: number
}

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '6h', label: '6 Horas', hours: 6 },
  { value: '1d', label: '1 Día', hours: 24 },
  { value: '3d', label: '3 Días', hours: 72 },
  { value: '7d', label: '7 Días', hours: 168 },
]
