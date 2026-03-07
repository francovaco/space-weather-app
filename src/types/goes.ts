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
    id: '01', number: 1, name: 'Visible Azul', shortName: 'Azul', wavelength: '0.47 µm',
    wavelengthValue: 0.47, type: 'visible', primaryUse: 'Detección de aerosoles, calidad del aire',
    description: 'Banda azul usada para detectar aerosoles y humo. Buena visibilidad diurna.',
    resolution: '1 km', color: '#60a5fa',
  },
  {
    id: '02', number: 2, name: 'Visible Rojo', shortName: 'Rojo', wavelength: '0.64 µm',
    wavelengthValue: 0.64, type: 'visible', primaryUse: 'Imágenes visibles de alta resolución',
    description: 'Banda ABI de mayor resolución (0.5 km). Ideal para detalles de tormentas convectivas.',
    resolution: '0.5 km', color: '#f87171',
  },
  {
    id: '03', number: 3, name: 'Vegetación', shortName: 'Veggie', wavelength: '0.86 µm',
    wavelengthValue: 0.86, type: 'near-ir', primaryUse: 'Análisis de vegetación, cicatrices de incendios',
    description: 'Banda infrarroja cercana sensible a la salud de la vegetación. Diferencia nubes de nieve.',
    resolution: '1 km', color: '#4ade80',
  },
  {
    id: '04', number: 4, name: 'Cirros', shortName: 'Cirros', wavelength: '1.37 µm',
    wavelengthValue: 1.37, type: 'near-ir', primaryUse: 'Detección de nubes cirros delgadas',
    description: 'Detecta nubes cirros delgadas de gran altitud invisibles para otros canales.',
    resolution: '2 km', color: '#a5f3fc',
  },
  {
    id: '05', number: 5, name: 'Nieve/Hielo', shortName: 'Nieve/Hielo', wavelength: '1.6 µm',
    wavelengthValue: 1.6, type: 'near-ir', primaryUse: 'Discriminación nieve/hielo',
    description: 'Distingue nieve de nubes, y nubes de hielo de nubes de agua.',
    resolution: '1 km', color: '#e0f2fe',
  },
  {
    id: '06', number: 6, name: 'Tamaño de Partículas en Nubes', shortName: 'Part. Nubes', wavelength: '2.24 µm',
    wavelengthValue: 2.24, type: 'near-ir', primaryUse: 'Estimación del tamaño de partículas en nubes',
    description: 'Mide el tamaño de las partículas de las nubes — distingue gotas pequeñas de grandes.',
    resolution: '2 km', color: '#bfdbfe',
  },
  {
    id: '07', number: 7, name: 'Ventana Onda Corta', shortName: 'OC Corta', wavelength: '3.9 µm',
    wavelengthValue: 3.9, type: 'ir', primaryUse: 'Detección de incendios, niebla, nubes bajas',
    description: 'Crítico para la detección de incendios. También se usa para niebla y nubes bajas de noche.',
    resolution: '2 km', color: '#fb923c',
  },
  {
    id: '08', number: 8, name: 'Vapor de Agua Nivel Alto', shortName: 'VA Alto', wavelength: '6.19 µm',
    wavelengthValue: 6.19, type: 'ir', primaryUse: 'Humedad en la troposfera alta',
    description: 'Muestra patrones de humedad en la atmósfera superior (nivel 300-600 hPa).',
    resolution: '2 km', color: '#818cf8',
  },
  {
    id: '09', number: 9, name: 'Vapor de Agua Nivel Medio', shortName: 'VA Medio', wavelength: '6.93 µm',
    wavelengthValue: 6.93, type: 'ir', primaryUse: 'Humedad en la troposfera media',
    description: 'Seguimiento de humedad en niveles medios de la troposfera (~500 hPa).',
    resolution: '2 km', color: '#a78bfa',
  },
  {
    id: '10', number: 10, name: 'Vapor de Agua Nivel Bajo', shortName: 'VA Bajo', wavelength: '7.34 µm',
    wavelengthValue: 7.34, type: 'ir', primaryUse: 'Humedad en la troposfera baja',
    description: 'Humedad en la atmósfera baja. Sensible a la humedad de la capa límite.',
    resolution: '2 km', color: '#c4b5fd',
  },
  {
    id: '11', number: 11, name: 'Fase en Cima de Nubes', shortName: 'Cima Nubes', wavelength: '8.44 µm',
    wavelengthValue: 8.44, type: 'ir', primaryUse: 'Detección de fase de nubes (hielo vs agua)',
    description: 'Identifica si las cimas de las nubes están compuestas de cristales de hielo o gotas de agua.',
    resolution: '2 km', color: '#67e8f9',
  },
  {
    id: '12', number: 12, name: 'Ozono', shortName: 'Ozono', wavelength: '9.61 µm',
    wavelengthValue: 9.61, type: 'ir', primaryUse: 'Detección de ozono, tropopausa dinámica',
    description: 'Sensible a la absorción del ozono. Usado para dinámica de la tropopausa.',
    resolution: '2 km', color: '#86efac',
  },
  {
    id: '13', number: 13, name: 'Ventana IR Limpia Onda Larga', shortName: 'IR Limpia', wavelength: '10.35 µm',
    wavelengthValue: 10.35, type: 'ir', primaryUse: 'Temperatura de cima de nubes (limpia)',
    description: 'IR de onda larga principal. Menos afectado por vapor de agua. Temperatura cima de nubes.',
    resolution: '2 km', color: '#fcd34d',
  },
  {
    id: '14', number: 14, name: 'Ventana IR Onda Larga', shortName: 'IR Ventana', wavelength: '11.19 µm',
    wavelengthValue: 11.19, type: 'ir', primaryUse: 'Temperatura de cima de nubes, TSM',
    description: 'Ventana IR clásica. Estimación de TSM, recuperación de temperatura de cima de nubes.',
    resolution: '2 km', color: '#fbbf24',
  },
  {
    id: '15', number: 15, name: 'Ventana Onda Larga Sucia', shortName: 'IR Sucia', wavelength: '12.3 µm',
    wavelengthValue: 12.3, type: 'ir', primaryUse: 'Humedad baja, detección de polvo',
    description: 'Más sensible al vapor de agua. Combinado con 10.3 µm para detección de polvo.',
    resolution: '2 km', color: '#f97316',
  },
  {
    id: '16', number: 16, name: 'Infrarrojo Onda Larga CO₂', shortName: 'CO₂ IR', wavelength: '13.3 µm',
    wavelengthValue: 13.3, type: 'ir', primaryUse: 'Altura de cima de nubes, temperatura CO₂',
    description: 'Banda de absorción de CO₂. Infiere presión de cima de nubes y temperatura atmosférica.',
    resolution: '2 km', color: '#ef4444',
  },
]

export const ABI_BAND_MAP = new Map<ABIBand, ABIBandInfo>(
  ABI_BANDS.map((b) => [b.id, b])
)
