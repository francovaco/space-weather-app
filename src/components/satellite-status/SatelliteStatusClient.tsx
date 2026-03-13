'use client'
// ============================================================
// src/components/satellite-status/SatelliteStatusClient.tsx
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { formatInTimeZone } from 'date-fns-tz'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import { DataAge } from '@/components/ui/DataAge'
import {
  Satellite, RefreshCw, ExternalLink, AlertTriangle,
  CheckCircle2, AlertCircle, XCircle, Clock, Info,
  Zap, Radio, Activity, Sun, Globe, Wifi, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────

type StatusColor = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLUE' | 'UNKNOWN'
type AnomalyType = 'outage' | 'degradation' | 'correction' | 'update' | 'info'

interface Anomaly {
  title: string
  href: string
  date: string
  satellite: string
  type: AnomalyType
}

interface SatRow {
  name: string
  role: string
  color: StatusColor
}

interface StatusResponse {
  fetchedAt: string
  satellites: SatRow[]
  anomalies: Anomaly[]
  sourceUrl: string
  parseError?: string
}

// ── Instrument definitions ─────────────────────────────────────

interface Instrument {
  id: string
  nombre: string
  nombreCompleto: string
  descripcion: string
  productos: string[]
  icon: React.ReactNode
  color: string
  esClimaEspacial: boolean
  exclusivoGOES19?: boolean
}

const INSTRUMENTS: Instrument[] = [
  {
    id: 'ABI',
    nombre: 'ABI',
    nombreCompleto: 'Generador de Imágenes de Línea de Base Avanzado',
    descripcion: 'Instrumento principal de imágenes. Genera imágenes en 16 bandas espectrales (2 visibles, 4 infrarrojo cercano, 10 infrarrojo térmico) con resoluciones de 0.5 a 2 km cada 5–15 minutos.',
    productos: ['Imágenes multiespectrales', 'Temperatura de brillo', 'Nube y niebla', 'Incendios activos', 'Aerosoles', 'Nieve y hielo'],
    icon: <Satellite size={15} />,
    color: '#3b82f6',
    esClimaEspacial: false,
  },
  {
    id: 'GLM',
    nombre: 'GLM',
    nombreCompleto: 'Mapeador de Rayos Geoestacionario',
    descripcion: 'Detecta rayos totales (nube-suelo e intra-nube) con cobertura continua 24/7. Primer instrumento de este tipo en un satélite geoestacionario operacional de NOAA.',
    productos: ['Densidad de rayos', 'Energía óptica de rayos', 'Conteo de grupos', 'Seguimiento de tormentas'],
    icon: <Zap size={15} />,
    color: '#f59e0b',
    esClimaEspacial: false,
  },
  {
    id: 'SUVI',
    nombre: 'SUVI',
    nombreCompleto: 'Generador de Imágenes Ultravioleta Solar',
    descripcion: 'Telescopio que monitorea el sol en el rango ultravioleta extremo en 6 longitudes de onda (94, 131, 171, 195, 284 y 304 Å). Observa la corona solar y detecta llamaradas y CMEs.',
    productos: ['Imágenes coronales UV', 'Mapa de corona solar', 'Mapas de filamentos', 'Detección de llamaradas'],
    icon: <Sun size={15} />,
    color: '#f97316',
    esClimaEspacial: true,
  },
  {
    id: 'EXIS',
    nombre: 'EXIS',
    nombreCompleto: 'Sensores de Irradiancia UV Extremo y Rayos X',
    descripcion: 'Mide el flujo de rayos X solares (XRS) en dos canales: onda corta 0.05–0.4 nm y onda larga 0.1–0.8 nm para clasificación de llamaradas. También mide irradiancia EUV (EUVS).',
    productos: ['Flujo de rayos X (XRS)', 'Irradiancia EUV (EUVS)', 'Clasificación de llamaradas A/B/C/M/X', 'Monitor de irradiancia solar'],
    icon: <Activity size={15} />,
    color: '#ef4444',
    esClimaEspacial: true,
  },
  {
    id: 'MAG',
    nombre: 'MAG',
    nombreCompleto: 'Magnetómetro',
    descripcion: 'Mide el campo magnético ambiental en la órbita geoestacionaria. Provee datos clave para detección de tormentas geomagnéticas y monitoreo del cinturón de radiación.',
    productos: ['Componentes Hp, He, Hn del campo magnético', 'Campo magnético total', 'Índice geomagnético Kp', 'Alertas de tormenta geomagnética'],
    icon: <Globe size={15} />,
    color: '#8b5cf6',
    esClimaEspacial: true,
  },
  {
    id: 'SEISS',
    nombre: 'SEISS',
    nombreCompleto: 'Suite de Sensores In Situ del Entorno Espacial',
    descripcion: 'Suite de 4 sensores que miden partículas energéticas: SGPS (protones y alfas), EHIS (electrones e iones pesados), MPS-LO y MPS-HI (protones y electrones de alta energía).',
    productos: ['Flujo de protones energéticos', 'Flujo de electrones energéticos', 'Iones pesados', 'Monitor de dosis de radiación'],
    icon: <Radio size={15} />,
    color: '#06b6d4',
    esClimaEspacial: true,
  },
  {
    id: 'CCOR-1',
    nombre: 'CCOR-1',
    nombreCompleto: 'Coronógrafo Compacto 1',
    descripcion: 'EXCLUSIVO del GOES-19. Primer coronógrafo compacto operacional en un satélite geoestacionario. Observa la corona solar en el rango 3.0–17.5 radios solares para detectar CMEs y alertas tempranas de tormentas geomagnéticas.',
    productos: ['Imágenes de corona solar', 'Detección de CMEs', 'Alertas tempranas de tormenta geomagnética', 'Velocidad y masa de CMEs'],
    icon: <Eye size={15} />,
    color: '#10b981',
    esClimaEspacial: true,
    exclusivoGOES19: true,
  },
  {
    id: 'DCS',
    nombre: 'DCS',
    nombreCompleto: 'Sistema de Recolección de Datos',
    descripcion: 'Recibe y retransmite datos de plataformas de recolección distribuidas en tierra, mar y aire. Transmite alertas de emergencia y datos ambientales de miles de sensores remotos.',
    productos: ['Retransmisión de datos ambientales', 'Alertas EMWIN', 'Transmisión HRIT/LRIT', 'Redifusión GOES (GRB)'],
    icon: <Wifi size={15} />,
    color: '#64748b',
    esClimaEspacial: false,
  },
]

// ── Configuración de estados ───────────────────────────────────

const STATUS_CONFIG: Record<StatusColor, {
  label: string
  desc: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
}> = {
  GREEN:   { label: 'Operacional',                desc: 'Funcionamiento nominal',          color: '#22c55e', bg: 'bg-green-500/10',  border: 'border-green-500/30',  icon: <CheckCircle2 size={13} /> },
  YELLOW:  { label: 'Operacional con Limitación', desc: 'Limitación en algún subsistema',  color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <AlertCircle size={13} />  },
  ORANGE:  { label: 'Degradado',                  desc: 'Degradación en operación',        color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: <AlertTriangle size={13} />},
  RED:     { label: 'No Operacional',             desc: 'Fuera de servicio',               color: '#ef4444', bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: <XCircle size={13} />      },
  BLUE:    { label: 'Funcional (Apagado)',         desc: 'En almacenamiento en órbita',     color: '#3b82f6', bg: 'bg-blue-500/10',  border: 'border-blue-500/30',   icon: <Info size={13} />         },
  UNKNOWN: { label: 'Desconocido',                desc: 'Estado no disponible',            color: '#64748b', bg: 'bg-slate-500/10', border: 'border-slate-500/30',  icon: <Info size={13} />         },
}

const ANOMALY_CONFIG: Record<AnomalyType, { label: string; color: string; bg: string }> = {
  outage:      { label: 'Interrupción',  color: '#ef4444', bg: 'bg-red-500/10'    },
  degradation: { label: 'Degradación',   color: '#f97316', bg: 'bg-orange-500/10' },
  correction:  { label: 'Corrección',    color: '#22c55e', bg: 'bg-green-500/10'  },
  update:      { label: 'Actualización', color: '#3b82f6', bg: 'bg-blue-500/10'   },
  info:        { label: 'Información',   color: '#94a3b8', bg: 'bg-slate-500/10'  },
}

// ── Datos orbitales del GOES-19 ────────────────────────────────

const GOES19_INFO = {
  nombre: 'GOES-19',
  alias: 'GOES Este',
  operador: 'NOAA / NASA',
  lanzamiento: '25 de junio de 2024',
  operativoDesde: '7 de abril de 2025',
  cohete: 'SpaceX Falcon Heavy',
  constructor: 'Lockheed Martin',
  orbita: 'Geoestacionaria — 35.786 km',
  longitud: '75.2° O',
  inclinacion: '~0°',
  vidaUtil: 'Hasta 2033',
  masa: '~5.192 kg (en órbita)',
  potencia: '4.9 kW (paneles solares)',
  serie: 'GOES-R (4.ª y última unidad)',
}

// ── Traducción automática de mensajes NOAA ─────────────────────
// Los mensajes de anomalías llegan en inglés desde NOAA OSPO.
// Esta función los traduce al español automáticamente.

function traducirAnomalia(texto: string): string {
  let t = texto
    .replace(/^\(Correction\)\s*/i, '')
    .replace(/^Product Anomaly\/Outage:\s*/i, '')
    .replace(/^Degradation of\s+/i, 'Degradación de ')
    .replace(/^Update #?(\d+):\s*/i, 'Actualización #$1: ')
    .replace(/^Correction:\s*/i, 'Corrección: ')
    .replace(/^Anomaly:\s*/i, 'Anomalía: ')
    .replace(/^Notice:\s*/i, 'Aviso: ')

  const reemplazos: [RegExp, string][] = [
    // Estado general
    [/\bAll Products and derived products\b/gi,          'todos los productos y productos derivados'],
    [/\bAll Products\b/gi,                               'todos los productos'],
    [/\bderived products?\b/gi,                          'productos derivados'],
    [/\bproducts? delivered to\b/gi,                     'productos entregados a'],
    [/\bdelivered to\b/gi,                               'entregados a'],
    [/\bProduct Anomaly\b/gi,                            'anomalía de producto'],
    [/\bOutage\b/gi,                                     'interrupción'],
    [/\bDegradation\b/gi,                                'degradación'],
    [/\bRestored\b/gi,                                   'restaurado'],
    [/\bNominal\b/gi,                                    'nominal'],
    [/\bOff-?line\b/gi,                                  'fuera de línea'],
    [/\bOn-?line\b/gi,                                   'en línea'],
    [/\bScheduled\b/gi,                                  'programado'],
    [/\bUnscheduled\b/gi,                                'no programado'],
    [/\bOperational\b/gi,                                'operacional'],
    [/\bNon-Operational\b/gi,                            'no operacional'],
    [/\bDelayed\b/gi,                                    'retrasado'],
    [/\bInterrupted\b/gi,                                'interrumpido'],
    [/\bResolved\b/gi,                                   'resuelto'],
    [/\bPending\b/gi,                                    'pendiente'],
    [/\bInvestigation\b/gi,                              'investigación'],
    [/\bMonitoring\b/gi,                                 'monitoreo'],
    [/\bReverted\b/gi,                                   'revertido'],
    [/\bAffecting\b/gi,                                  'afectando'],
    [/\bImpacting\b/gi,                                  'impactando'],
    [/\bCaused by\b/gi,                                  'causado por'],
    [/\bDue to\b/gi,                                     'debido a'],
    // Instrumentos y datos
    [/\bABI L1b Bands?\b/gi,                             'Bandas ABI L1b'],
    [/\bABI L2\b/gi,                                     'ABI L2'],
    [/\bABI Bands?\b/gi,                                 'Bandas ABI'],
    [/\bBand\b/gi,                                       'Banda'],
    // Productos meteorológicos
    [/\bDownward Shortwave (Radiation|Insolation)\b/gi,  'insolación de onda corta descendente'],
    [/\bReflected Shortwave Radiation\b/gi,              'radiación de onda corta reflejada'],
    [/\bPhotosynthetically Active( Radiation)?\b/gi,     'radiación fotosintéticamente activa'],
    [/\bCloud Top Height\b/gi,                           'altura de cima de nubes'],
    [/\bCloud Top Pressure\b/gi,                         'presión de cima de nubes'],
    [/\bCloud Top Temperature\b/gi,                      'temperatura de cima de nubes'],
    [/\bCloud and Moisture Imagery\b/gi,                 'imágenes de nubes y humedad'],
    [/\bLand Surface Temperature\b/gi,                   'temperatura de superficie terrestre'],
    [/\bSea Surface Temperature\b/gi,                    'temperatura superficial del mar'],
    [/\bFire Detection\b/gi,                             'detección de incendios'],
    [/\bAerosol Detection\b/gi,                          'detección de aerosoles'],
    [/\bSnow Cover\b/gi,                                 'cobertura de nieve'],
    [/\bVegetation Index\b/gi,                           'índice de vegetación'],
    [/\bLightning Detection\b/gi,                        'detección de rayos'],
    [/\bTotal Lightning\b/gi,                            'rayos totales'],
    [/\bWater Vapor\b/gi,                                'vapor de agua'],
    [/\bUpper.?Level\b/gi,                               'nivel alto'],
    [/\bLower.?Level\b/gi,                               'nivel bajo'],
    [/\bMid.?Level\b/gi,                                 'nivel medio'],
    [/\bShortwave\b/gi,                                  'onda corta'],
    [/\bLongwave\b/gi,                                   'onda larga'],
    [/\bSolar Irradiance\b/gi,                           'irradiancia solar'],
    [/\bX.Ray Flux\b/gi,                                 'flujo de rayos X'],
    [/\bProton Flux\b/gi,                                'flujo de protones'],
    [/\bElectron Flux\b/gi,                              'flujo de electrones'],
    [/\bGeomagnetic Storm\b/gi,                          'tormenta geomagnética'],
    [/\bSolar Wind\b/gi,                                 'viento solar'],
    [/\bSolar Flare\b/gi,                                'llamarada solar'],
    [/\bCoronal Mass Ejection\b/gi,                      'eyección de masa coronal (CME)'],
    // Sistemas de distribución
    [/delivered to PDA/gi,   'entregados al PDA'],
    [/delivered to AWIPS/gi, 'entregados al AWIPS'],
    [/delivered to GRB/gi,   'entregados al GRB'],
    // Meses
    [/\bJanuary\b/g,   'enero'],   [/\bFebruary\b/g, 'febrero'],
    [/\bMarch\b/g,     'marzo'],   [/\bApril\b/g,    'abril'],
    [/\bMay\b/g,       'mayo'],    [/\bJune\b/g,     'junio'],
    [/\bJuly\b/g,      'julio'],   [/\bAugust\b/g,   'agosto'],
    [/\bSeptember\b/g, 'septiembre'],[/\bOctober\b/g, 'octubre'],
    [/\bNovember\b/g,  'noviembre'],[/\bDecember\b/g, 'diciembre'],
    [/\bJan\b/g, 'ene'], [/\bFeb\b/g, 'feb'], [/\bMar\b/g, 'mar'],
    [/\bApr\b/g, 'abr'], [/\bJun\b/g, 'jun'], [/\bJul\b/g, 'jul'],
    [/\bAug\b/g, 'ago'], [/\bSep\b/g, 'sep'], [/\bOct\b/g, 'oct'],
    [/\bNov\b/g, 'nov'], [/\bDec\b/g, 'dic'],
    // Palabras sueltas
    [/\bIssued:\s*/gi,  'emitido: '],
    [/\bwith\b/gi,      'con'],
    [/\band\b/gi,       'y'],
    [/\bfor\b/gi,       'para'],
    [/\ball\b/gi,       'todos'],
  ]

  for (const [patron, reemplazo] of reemplazos) {
    t = t.replace(patron, reemplazo)
  }

  return t.charAt(0).toUpperCase() + t.slice(1)
}

// Traduce la fecha de las anomalías que vienen en inglés
function traducirFecha(fecha: string): string {
  return fecha
    .replace(/\bJan\b/g, 'ene').replace(/\bFeb\b/g, 'feb')
    .replace(/\bMar\b/g, 'mar').replace(/\bApr\b/g, 'abr')
    .replace(/\bMay\b/g, 'may').replace(/\bJun\b/g, 'jun')
    .replace(/\bJul\b/g, 'jul').replace(/\bAug\b/g, 'ago')
    .replace(/\bSep\b/g, 'sep').replace(/\bOct\b/g, 'oct')
    .replace(/\bNov\b/g, 'nov').replace(/\bDec\b/g, 'dic')
    .replace(/\bJanuary\b/g, 'enero').replace(/\bFebruary\b/g, 'febrero')
    .replace(/\bMarch\b/g, 'marzo').replace(/\bApril\b/g, 'abril')
    .replace(/\bJune\b/g, 'junio').replace(/\bJuly\b/g, 'julio')
    .replace(/\bAugust\b/g, 'agosto').replace(/\bSeptember\b/g, 'septiembre')
    .replace(/\bOctober\b/g, 'octubre').replace(/\bNovember\b/g, 'noviembre')
    .replace(/\bDecember\b/g, 'diciembre')
}

// Traduce el rol del satélite (viene en inglés desde OSPO)
function traducirRol(role: string): string {
  const mapa: Record<string, string> = {
    'Operational East': 'GOES Este — Operacional',
    'Operational West': 'GOES Oeste — Operacional',
    'On-Orbit Storage': 'Almacenamiento en Órbita',
    'On-Orbit Spare':   'Repuesto en Órbita',
    'Test':             'En Pruebas',
  }
  return mapa[role] ?? role
}

// ── Componente principal ───────────────────────────────────────

export function SatelliteStatusClient() {
  const { data, isLoading, isError, dataUpdatedAt, isFetching } =
    useQuery<StatusResponse>({
      queryKey: ['goes-status'],
      queryFn: () => fetch('/api/goes/status').then((r) => r.json()),
      refetchInterval: 60 * 1000,
      staleTime: 50 * 1000,
    })

  const goes19Row = data?.satellites?.find(
    (s) => s.name === 'GOES-19' || s.role?.toLowerCase().includes('east')
  )
  const goes19Color: StatusColor = goes19Row?.color ?? 'GREEN'
  const statusCfg = STATUS_CONFIG[goes19Color]

  const goes19Anomalies = data?.anomalies?.filter((a) => a.satellite === 'GOES-19') ?? []
  const allAnomalies = data?.anomalies ?? []

  const lastUpdate = dataUpdatedAt
    ? formatInTimeZone(new Date(dataUpdatedAt), 'UTC', 'HH:mm:ss') + ' UTC'
    : '—'

  return (
    <div className="space-y-6 pb-8">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
              Estado del Satélite e Instrumentos
            </h1>
            <DataAge timestamp={data?.fetchedAt} />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            GOES-19 (GOES Este) · Fuente: NOAA OSPO · Actualización automática cada 1 minuto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-text-dim">Actualizado: {lastUpdate}</span>
          {isFetching && <RefreshCw size={11} className="animate-spin text-primary" />}
        </div>
      </div>

      {/* Tarjeta principal GOES-19 */}
      <div className={cn('rounded-lg border p-4', statusCfg.border, statusCfg.bg)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border-2"
              style={{ borderColor: statusCfg.color, boxShadow: `0 0 16px ${statusCfg.color}44` }}
            >
              <Satellite size={24} style={{ color: statusCfg.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-text-primary">GOES-19</h2>
                <span className="font-data text-xs text-text-muted">/ GOES Este</span>
                {isLoading && <RefreshCw size={11} className="animate-spin text-text-dim" />}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span style={{ color: statusCfg.color }}>{statusCfg.icon}</span>
                <span className="text-sm font-medium" style={{ color: statusCfg.color }}>
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-2xs text-text-muted">{statusCfg.desc}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-2xs sm:grid-cols-3">
            <InfoPair label="Posición" value={GOES19_INFO.longitud} />
            <InfoPair label="Órbita" value="Geoestacionaria" />
            <InfoPair label="Altitud" value="35.786 km" />
            <InfoPair label="Operativo desde" value={GOES19_INFO.operativoDesde} />
            <InfoPair label="Vida útil" value={GOES19_INFO.vidaUtil} />
            <InfoPair label="Serie" value="GOES-R (4.ª unidad)" />
          </div>
        </div>
      </div>

      {/* Leyenda de estados */}
      <div className="flex flex-wrap gap-3">
        <span className="text-2xs text-text-muted uppercase tracking-wider font-medium">Referencia de estados:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span style={{ color: cfg.color }}>{cfg.icon}</span>
            <span className="text-2xs text-text-secondary">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Constelación GOES */}
      {data?.satellites && data.satellites.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="section-label">Constelación GOES en órbita</span>
            <a
              href="https://www.ospo.noaa.gov/operations/goes/status.html"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-2xs text-text-muted hover:text-accent-cyan transition-colors"
            >
              <ExternalLink size={10} /> Fuente OSPO
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-6 font-medium text-text-muted">Satélite</th>
                  <th className="pb-2 pr-6 font-medium text-text-muted">Función</th>
                  <th className="pb-2 font-medium text-text-muted">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.satellites.map((sat) => {
                  const cfg = STATUS_CONFIG[sat.color]
                  const esActivo = sat.name === 'GOES-19'
                  return (
                    <tr key={sat.name} className={cn('border-b border-border/40', esActivo && 'bg-primary/5')}>
                      <td className="py-2 pr-6">
                        <span className={cn('font-display font-semibold', esActivo ? 'text-primary' : 'text-text-primary')}>
                          {sat.name}
                        </span>
                        {esActivo && (
                          <span className="ml-2 badge-live text-2xs">Este satélite</span>
                        )}
                      </td>
                      <td className="py-2 pr-6 text-text-secondary">
                        {traducirRol(sat.role)}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: cfg.color }}>{cfg.icon}</span>
                          <span style={{ color: cfg.color }} className="text-xs font-medium">{cfg.label}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Instrumentos a bordo */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary">
            Instrumentos a Bordo
          </h2>
          <div className="flex gap-2">
            <span className="badge border border-blue-400/30 bg-blue-400/10 text-2xs text-blue-300">
              Meteorológico
            </span>
            <span className="badge border border-orange-400/30 bg-orange-400/10 text-2xs text-orange-300">
              Clima Espacial
            </span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {INSTRUMENTS.map((inst) => (
            <InstrumentCard key={inst.id} instrument={inst} estadoSatelite={goes19Color} />
          ))}
        </div>
      </div>

      {/* Anomalías y alertas */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary">
            Anomalías y Alertas Recientes
          </h2>
          <a
            href="https://www.ospo.noaa.gov/operations/messages.html"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-2xs text-text-muted hover:text-accent-cyan transition-colors"
          >
            <ExternalLink size={10} /> Ver todas
          </a>
        </div>

        {isLoading && (
          <div className="card">
            <LoadingMessage message="Cargando anomalías…" className="py-12" />
          </div>
        )}

        {isError && (
          <div className="card">
            <ErrorMessage 
              message="Error al cargar anomalías" 
              description="No se pudieron obtener los mensajes de estado por el momento."
              className="py-12" 
            />
          </div>
        )}

        {!isLoading && !isError && allAnomalies.length === 0 && (
          <div className="card">
            <EmptyMessage 
              message="Sin anomalías recientes" 
              description="No se han registrado eventos o interrupciones en las últimas 24 horas."
              className="py-12" 
            />
          </div>
        )}

        {allAnomalies.length > 0 && (
          <div className="space-y-2">
            {[...goes19Anomalies, ...allAnomalies.filter((a) => a.satellite !== 'GOES-19')]
              .slice(0, 10)
              .map((anomaly, i) => (
                <AnomalyRow key={i} anomaly={anomaly} highlight={anomaly.satellite === 'GOES-19'} />
              ))}
          </div>
        )}
      </div>

      {/* Especificaciones técnicas */}
      <div className="card">
        <div className="card-header">
          <span className="section-label">Especificaciones Técnicas — GOES-19</span>
          <a
            href="https://www.goes-r.gov/"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-2xs text-text-muted hover:text-accent-cyan transition-colors"
          >
            <ExternalLink size={10} /> goes-r.gov
          </a>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries({
            'Nombre':                GOES19_INFO.nombre,
            'Alias operacional':     GOES19_INFO.alias,
            'Operador':              GOES19_INFO.operador,
            'Constructor':           GOES19_INFO.constructor,
            'Cohete de lanzamiento': GOES19_INFO.cohete,
            'Fecha de lanzamiento':  GOES19_INFO.lanzamiento,
            'En servicio desde':     GOES19_INFO.operativoDesde,
            'Posición orbital':      GOES19_INFO.longitud,
            'Tipo de órbita':        GOES19_INFO.orbita,
            'Inclinación':           GOES19_INFO.inclinacion,
            'Vida útil estimada':    GOES19_INFO.vidaUtil,
            'Masa en órbita':        GOES19_INFO.masa,
            'Potencia solar':        GOES19_INFO.potencia,
            'Serie de satélite':     GOES19_INFO.serie,
          }).map(([label, value]) => (
            <div key={label} className="rounded border border-border bg-background-secondary p-2">
              <p className="text-2xs text-text-muted">{label}</p>
              <p className="font-data text-xs text-text-primary">{value}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────

function InstrumentCard({ instrument: inst, estadoSatelite }: {
  instrument: Instrument
  estadoSatelite: StatusColor
}) {
  const cfg = STATUS_CONFIG[estadoSatelite === 'GREEN' ? 'GREEN' : estadoSatelite]

  return (
    <div className={cn(
      'card flex flex-col gap-3 transition-all hover:border-border-accent',
      inst.exclusivoGOES19 && 'border-emerald-500/30'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: inst.color + '22', color: inst.color, border: `1px solid ${inst.color}33` }}
          >
            {inst.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xs font-bold text-text-primary">{inst.nombre}</span>
              {inst.exclusivoGOES19 && (
                <span className="badge border border-emerald-500/40 bg-emerald-500/10 text-2xs text-emerald-400">
                  Exclusivo G-19
                </span>
              )}
            </div>
            <p className="text-2xs text-text-muted leading-tight">{inst.nombreCompleto}</p>
          </div>
        </div>
        <span className={cn(
          'badge border shrink-0 text-2xs',
          inst.esClimaEspacial
            ? 'border-orange-400/30 bg-orange-400/10 text-orange-300'
            : 'border-blue-400/30 bg-blue-400/10 text-blue-300'
        )}>
          {inst.esClimaEspacial ? 'Clima Espacial' : 'Meteorológico'}
        </span>
      </div>

      <p className="text-2xs leading-relaxed text-text-muted">{inst.descripcion}</p>

      <div>
        <p className="mb-1 text-2xs font-medium uppercase tracking-wider text-text-dim">
          Productos
        </p>
        <div className="flex flex-wrap gap-1">
          {inst.productos.map((p) => (
            <span key={p} className="rounded border border-border bg-background px-1.5 py-0.5 text-2xs text-text-muted">
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className={cn('flex items-center gap-1.5 rounded border px-2 py-1', cfg.border, cfg.bg)}>
        <span style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className="text-2xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>
    </div>
  )
}

function AnomalyRow({ anomaly, highlight }: { anomaly: Anomaly; highlight?: boolean }) {
  const cfg = ANOMALY_CONFIG[anomaly.type]
  const textoEs = traducirAnomalia(anomaly.title)
  const fechaEs = traducirFecha(anomaly.date)

  return (
    <a
      href={anomaly.href}
      target="_blank" rel="noopener noreferrer"
      className={cn(
        'flex items-start gap-3 rounded-md border p-3 text-xs transition-colors hover:border-border-accent',
        highlight ? 'border-border bg-background-card' : 'border-border/50 bg-background'
      )}
    >
      <span
        className={cn('mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-2xs font-medium', cfg.bg)}
        style={{ color: cfg.color, borderColor: cfg.color + '44' }}
      >
        {cfg.label}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            'font-display text-2xs font-semibold',
            highlight ? 'text-primary' : 'text-text-secondary'
          )}>
            {anomaly.satellite}
          </span>
          {highlight && <span className="badge-live text-2xs">Este satélite</span>}
        </div>
        <p className="text-2xs text-text-secondary leading-relaxed line-clamp-2">
          {textoEs}
        </p>
        {fechaEs && (
          <div className="mt-1 flex items-center gap-1 text-2xs text-text-dim">
            <Clock size={9} />
            {fechaEs}
          </div>
        )}
      </div>
      <ExternalLink size={11} className="mt-0.5 shrink-0 text-text-dim" />
    </a>
  )
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-2xs text-text-dim">{label}: </span>
      <span className="font-data text-2xs text-text-secondary">{value}</span>
    </div>
  )
}
