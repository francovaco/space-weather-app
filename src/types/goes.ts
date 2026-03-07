// ============================================================
// src/types/goes.ts — GOES-19 satellite types
// ============================================================

/** All 16 ABI bands available on GOES-19 */
export type ABIBand =
  | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08'
  | '09' | '10' | '11' | '12' | '13' | '14' | '15' | '16'

/** Image resolution options for ABI imagery download */
export type ImageResolution = '339' | '678' | '1808' | '5424' | '10848'

/** GOES-19 sector codes */
export type GOESSector =
  | 'FD'   // Full Disk
  | 'CONUS'// Continental US
  | 'MESO1'// Mesoscale 1
  | 'MESO2'// Mesoscale 2
  | 'ssa'  // South America

/** Metadata for each ABI band */
export interface ABIBandInfo {
  id: ABIBand
  number: number
  name: string
  shortName: string
  wavelength: string
  wavelengthValue: number
  type: 'visible' | 'near-ir' | 'ir'
  primaryUse: string
  description: string
  resolution: string // e.g. "0.5 km" | "1 km" | "2 km"
  color: string // CSS color for UI accent
}

/** A single satellite image frame */
export interface SatelliteFrame {
  url: string
  timestamp: Date
  band: ABIBand
  sector: GOESSector
  resolution: ImageResolution
}

/** GOES instrument status */
export type InstrumentStatus = 'operational' | 'degraded' | 'offline' | 'testing'

export interface GOESInstrument {
  name: string
  shortName: string
  status: InstrumentStatus
  lastUpdated: Date
  notes?: string
}

export interface GOESSatelliteStatus {
  satellite: 'GOES-19' | 'GOES-18' | 'GOES-16'
  status: InstrumentStatus
  instruments: GOESInstrument[]
  lastChecked: Date
}

/** ABI band definitions */
export const ABI_BANDS: ABIBandInfo[] = [
  {
    id: '01', number: 1, name: 'Blue Visible', shortName: 'Blue', wavelength: '0.47 µm',
    wavelengthValue: 0.47, type: 'visible', primaryUse: 'Aerosol detection, air quality',
    description: 'Blue band used for detecting aerosols and smoke. Good daytime visibility.',
    resolution: '1 km', color: '#60a5fa',
  },
  {
    id: '02', number: 2, name: 'Red Visible', shortName: 'Red', wavelength: '0.64 µm',
    wavelengthValue: 0.64, type: 'visible', primaryUse: 'High resolution visible imagery',
    description: 'Highest resolution ABI band (0.5 km). Ideal for convective storm detail.',
    resolution: '0.5 km', color: '#f87171',
  },
  {
    id: '03', number: 3, name: 'Veggie', shortName: 'Veggie', wavelength: '0.86 µm',
    wavelengthValue: 0.86, type: 'near-ir', primaryUse: 'Vegetation analysis, burn scars',
    description: 'Near-IR band sensitive to vegetation health. Differentiates clouds from snow.',
    resolution: '1 km', color: '#4ade80',
  },
  {
    id: '04', number: 4, name: 'Cirrus', shortName: 'Cirrus', wavelength: '1.37 µm',
    wavelengthValue: 1.37, type: 'near-ir', primaryUse: 'Thin cirrus cloud detection',
    description: 'Detects high thin cirrus clouds invisible to other channels.',
    resolution: '2 km', color: '#a5f3fc',
  },
  {
    id: '05', number: 5, name: 'Snow/Ice', shortName: 'Snow/Ice', wavelength: '1.6 µm',
    wavelengthValue: 1.6, type: 'near-ir', primaryUse: 'Snow/ice discrimination',
    description: 'Distinguishes snow from clouds, and ice from water clouds.',
    resolution: '1 km', color: '#e0f2fe',
  },
  {
    id: '06', number: 6, name: 'Cloud Particle Size', shortName: 'Cloud Size', wavelength: '2.24 µm',
    wavelengthValue: 2.24, type: 'near-ir', primaryUse: 'Cloud particle size estimation',
    description: 'Measures cloud particle size — distinguishes small vs large droplets.',
    resolution: '2 km', color: '#bfdbfe',
  },
  {
    id: '07', number: 7, name: 'Shortwave Window', shortName: 'SW Window', wavelength: '3.9 µm',
    wavelengthValue: 3.9, type: 'ir', primaryUse: 'Fire detection, fog, low clouds',
    description: 'Critical for fire detection. Also used for fog/low cloud detection at night.',
    resolution: '2 km', color: '#fb923c',
  },
  {
    id: '08', number: 8, name: 'Upper-Level Water Vapor', shortName: 'WV High', wavelength: '6.19 µm',
    wavelengthValue: 6.19, type: 'ir', primaryUse: 'Upper troposphere moisture',
    description: 'Shows moisture patterns in the upper atmosphere (300-600 hPa level).',
    resolution: '2 km', color: '#818cf8',
  },
  {
    id: '09', number: 9, name: 'Mid-Level Water Vapor', shortName: 'WV Mid', wavelength: '6.93 µm',
    wavelengthValue: 6.93, type: 'ir', primaryUse: 'Mid troposphere moisture',
    description: 'Moisture tracking at mid-tropospheric levels (~500 hPa).',
    resolution: '2 km', color: '#a78bfa',
  },
  {
    id: '10', number: 10, name: 'Lower-Level Water Vapor', shortName: 'WV Low', wavelength: '7.34 µm',
    wavelengthValue: 7.34, type: 'ir', primaryUse: 'Lower troposphere moisture',
    description: 'Moisture in the lower atmosphere. Sensitive to boundary layer moisture.',
    resolution: '2 km', color: '#c4b5fd',
  },
  {
    id: '11', number: 11, name: 'Cloud-Top Phase', shortName: 'Cloud Top', wavelength: '8.44 µm',
    wavelengthValue: 8.44, type: 'ir', primaryUse: 'Cloud phase detection (ice vs water)',
    description: 'Identifies whether cloud tops are composed of ice crystals or water droplets.',
    resolution: '2 km', color: '#67e8f9',
  },
  {
    id: '12', number: 12, name: 'Ozone', shortName: 'Ozone', wavelength: '9.61 µm',
    wavelengthValue: 9.61, type: 'ir', primaryUse: 'Ozone detection, dynamic tropopause',
    description: 'Sensitive to ozone absorption. Used for tropopause dynamics.',
    resolution: '2 km', color: '#86efac',
  },
  {
    id: '13', number: 13, name: 'Clean IR Longwave Window', shortName: 'Clean IR', wavelength: '10.35 µm',
    wavelengthValue: 10.35, type: 'ir', primaryUse: 'Cloud top temperature (clean)',
    description: 'Primary longwave IR. Less affected by water vapor. Cloud top temps.',
    resolution: '2 km', color: '#fcd34d',
  },
  {
    id: '14', number: 14, name: 'IR Longwave Window', shortName: 'IR Window', wavelength: '11.19 µm',
    wavelengthValue: 11.19, type: 'ir', primaryUse: 'Cloud top temperature, SST',
    description: 'Classic IR window. SST estimation, cloud top temperature retrieval.',
    resolution: '2 km', color: '#fbbf24',
  },
  {
    id: '15', number: 15, name: 'Dirty Longwave Window', shortName: 'Dirty IR', wavelength: '12.3 µm',
    wavelengthValue: 12.3, type: 'ir', primaryUse: 'Low-level moisture, dust detection',
    description: 'More sensitive to water vapor. Combined with 10.3 µm for dust detection.',
    resolution: '2 km', color: '#f97316',
  },
  {
    id: '16', number: 16, name: 'CO₂ Longwave Infrared', shortName: 'CO₂ IR', wavelength: '13.3 µm',
    wavelengthValue: 13.3, type: 'ir', primaryUse: 'Cloud top height, CO₂ temperature',
    description: 'CO₂ absorption band. Infers cloud top pressure and atmospheric temperature.',
    resolution: '2 km', color: '#ef4444',
  },
]

export const ABI_BAND_MAP = new Map<ABIBand, ABIBandInfo>(
  ABI_BANDS.map((b) => [b.id, b])
)
