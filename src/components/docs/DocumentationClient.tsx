'use client'
// ============================================================
// src/components/docs/DocumentationClient.tsx
// ============================================================
import { useState } from 'react'
import { PDFThumbnail } from './PDFThumbnail'
import {
  BookOpen, ExternalLink, FileText, ChevronDown, ChevronUp,
  Satellite, Zap, Cloud, Flame, Radio, Wifi, Globe,
  Snowflake, Mountain, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────

interface ABIBand {
  numero: number
  longitud: string    // µm
  nombre: string
  tipo: 'Visible' | 'Infrarrojo Cercano' | 'Infrarrojo'
  color: string
  usoCorto: string
  pdfUrl: string
}

interface DocSection {
  id: string
  titulo: string
  descripcion: string
  icon: React.ReactNode
  docs: DocItem[]
}

interface DocItem {
  titulo: string
  descripcion: string
  pdfUrl: string
  tag: string
}

// ── ABI Bands data ───────────────────────────────────────────

const ABI_BANDS: ABIBand[] = [
  { numero: 1,  longitud: '0.47',  nombre: 'Azul',                     tipo: 'Visible',             color: '#60a5fa', usoCorto: 'Aerosoles, calidad del aire',              pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band01.pdf' },
  { numero: 2,  longitud: '0.64',  nombre: 'Rojo',                     tipo: 'Visible',             color: '#f87171', usoCorto: 'Imágenes visibles alta resolución (0.5 km)',pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band02.pdf' },
  { numero: 3,  longitud: '0.86',  nombre: 'Vegetación',               tipo: 'Infrarrojo Cercano',  color: '#4ade80', usoCorto: 'Análisis de vegetación, cicatrices',         pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band03.pdf' },
  { numero: 4,  longitud: '1.37',  nombre: 'Cirros',                   tipo: 'Infrarrojo Cercano',  color: '#a5f3fc', usoCorto: 'Detección de cirros delgados',               pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band04.pdf' },
  { numero: 5,  longitud: '1.60',  nombre: 'Nieve / Hielo',            tipo: 'Infrarrojo Cercano',  color: '#e0f2fe', usoCorto: 'Discriminación nieve/hielo vs nubes',        pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band05.pdf' },
  { numero: 6,  longitud: '2.24',  nombre: 'Tamaño de Partículas',     tipo: 'Infrarrojo Cercano',  color: '#bfdbfe', usoCorto: 'Tamaño de partículas en nubes',              pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band06.pdf' },
  { numero: 7,  longitud: '3.90',  nombre: 'Ventana Onda Corta',       tipo: 'Infrarrojo',          color: '#fb923c', usoCorto: 'Incendios, niebla, nubes bajas nocturnas',   pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band07.pdf' },
  { numero: 8,  longitud: '6.19',  nombre: 'Vapor de Agua Alto',       tipo: 'Infrarrojo',          color: '#818cf8', usoCorto: 'Humedad troposfera alta (300–600 hPa)',       pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band08.pdf' },
  { numero: 9,  longitud: '6.93',  nombre: 'Vapor de Agua Medio',      tipo: 'Infrarrojo',          color: '#a78bfa', usoCorto: 'Humedad troposfera media (~500 hPa)',         pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band09.pdf' },
  { numero: 10, longitud: '7.34',  nombre: 'Vapor de Agua Bajo',       tipo: 'Infrarrojo',          color: '#c4b5fd', usoCorto: 'Humedad troposfera baja, capa límite',       pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band10.pdf' },
  { numero: 11, longitud: '8.44',  nombre: 'Fase de Cima de Nubes',    tipo: 'Infrarrojo',          color: '#67e8f9', usoCorto: 'Fase de nubes: hielo vs agua líquida',       pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band11.pdf' },
  { numero: 12, longitud: '9.61',  nombre: 'Ozono',                    tipo: 'Infrarrojo',          color: '#86efac', usoCorto: 'Detección de ozono, tropopausa dinámica',    pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band12.pdf' },
  { numero: 13, longitud: '10.35', nombre: 'IR Limpia Onda Larga',     tipo: 'Infrarrojo',          color: '#fcd34d', usoCorto: 'Temperatura cima de nubes (limpia)',          pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band13.pdf' },
  { numero: 14, longitud: '11.19', nombre: 'Ventana IR Onda Larga',    tipo: 'Infrarrojo',          color: '#fbbf24', usoCorto: 'Temperatura cima de nubes, TSM',             pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band14.pdf' },
  { numero: 15, longitud: '12.30', nombre: 'Ventana Onda Larga Sucia', tipo: 'Infrarrojo',          color: '#f97316', usoCorto: 'Humedad baja, detección de polvo sahariano', pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band15.pdf' },
  { numero: 16, longitud: '13.30', nombre: 'CO₂ Infrarrojo Onda Larga',tipo: 'Infrarrojo',          color: '#ef4444', usoCorto: 'Altura de cima de nubes, temperatura CO₂',  pdfUrl: 'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band16.pdf' },
]

const TIPO_COLORS: Record<string, string> = {
  'Visible':            'border-blue-400/40 bg-blue-400/10 text-blue-300',
  'Infrarrojo Cercano': 'border-green-400/40 bg-green-400/10 text-green-300',
  'Infrarrojo':         'border-orange-400/40 bg-orange-400/10 text-orange-300',
}

// ── Document sections data ───────────────────────────────────

const SECTIONS: DocSection[] = [
  {
    id: 'databook',
    titulo: 'Manual de Datos del Satélite',
    descripcion: 'Referencia técnica completa del sistema satelital GOES-R: construcción, instrumentos, funcionamiento interno, productos de datos y segmento terrestre.',
    icon: <Satellite size={16} />,
    docs: [
      {
        titulo: 'GOES-R Series Data Book',
        descripcion: 'El documento técnico más completo de la serie GOES-R. Cubre la arquitectura del satélite, todos los instrumentos a bordo, especificaciones de diseño, productos de datos, y el segmento terrestre. Referencia obligatoria para entender el funcionamiento del GOES-19.',
        pdfUrl: 'https://www.goes-r.gov/downloads/resources/documents/GOES-RSeriesDataBook.pdf',
        tag: 'Referencia Técnica Completa',
      },
    ],
  },
  {
    id: 'abi-factsheet',
    titulo: 'Instrumento ABI — Generador de Imágenes de Línea de Base Avanzado',
    descripcion: 'El ABI es el instrumento principal de imágenes del GOES-19. Genera imágenes en 16 bandas espectrales (2 visibles, 4 infrarrojo cercano, 10 infrarrojo) con resoluciones de 0.5 a 2 km.',
    icon: <Zap size={16} />,
    docs: [
      {
        titulo: 'Hoja de Datos ABI — Advanced Baseline Imager',
        descripcion: 'Descripción general del instrumento ABI: capacidades, especificaciones técnicas, modos de imagen (escáner de disco completo, CONUS, Mesoescala) y productos de datos derivados.',
        pdfUrl: 'https://www.goes-r.gov/education/docs/Factsheet_ABI.pdf',
        tag: 'Instrumento ABI',
      },
    ],
  },
  {
    id: 'applications',
    titulo: 'Hojas de Datos por Aplicación',
    descripcion: 'Documentos que explican cómo los datos del GOES-19 son utilizados para aplicaciones meteorológicas y ambientales específicas.',
    icon: <Cloud size={16} />,
    docs: [
      {
        titulo: 'Aerosoles y Calidad del Aire',
        descripcion: 'Cómo GOES-19 detecta y cuantifica aerosoles, humo, polvo y ceniza volcánica. Aplicaciones para monitoreo de calidad del aire y alertas tempranas.',
        pdfUrl: 'https://www.goes-r.gov/education/docs/fs_aerosols.pdf',
        tag: 'Aerosoles · Calidad del Aire',
      },
      {
        titulo: 'Nubes e Imágenes de Humedad',
        descripcion: 'Productos de nubes y humedad derivados del ABI: altura de la cima de las nubes, temperatura, fase y perfiles de humedad atmosférica. Fundamental para el pronóstico.',
        pdfUrl: 'https://www.goes-r.gov/education/docs/fs_imagery.pdf',
        tag: 'Nubes · Humedad',
      },
      {
        titulo: 'Detección y Caracterización de Incendios',
        descripcion: 'Metodología de detección de incendios activos del GOES-19, frecuencia de actualización (cada 2 min en Mesoescala) e integración con productos de meteorología de incendios.',
        pdfUrl: 'https://www.goes-r.gov/education/docs/fs_fire.pdf',
        tag: 'Incendios · Fuego Activo',
      },
      {
        titulo: 'Detección de Rayos',
        descripcion: 'Capacidades del GLM y del ABI para la detección de descargas eléctricas: rayos nube-suelo, intra-nube y nube-nube. Aplicaciones para seguridad y pronóstico severo.',
        pdfUrl: 'https://www.goes-r.gov/education/docs/fs_lightning.pdf',
        tag: 'Rayos · Descargas Eléctricas',
      },
      {
        titulo: 'Detección de Ceniza Volcánica',
        descripcion: 'Técnicas para detectar y rastrear nubes de ceniza volcánica con imágenes ABI. Fundamental para la seguridad aérea y el monitoreo de erupciones volcánicas.',
        pdfUrl: 'https://www.goes-r.gov/education/docs/Factsheet-Volcanic_Ash.pdf',
        tag: 'Volcanes · Ceniza',
      },
      {
        titulo: 'Aplicaciones de Nieve y Hielo',
        descripcion: 'Uso del GOES-19 para monitoreo de cobertura de nieve, hielo marino, deshielo y aplicaciones hidrológicas en regiones de alta montaña.',
        pdfUrl: 'https://www.goes-r.gov/education/docs/GOES-R-SnowAndIceApplications.pdf',
        tag: 'Nieve · Hielo · Hidrología',
      },
    ],
  },
  {
    id: 'glm',
    titulo: 'GLM — Mapeador de Rayos Geoestacionario',
    descripcion: 'El GLM detecta rayos totales (nube-suelo e intra-nube) con cobertura continua las 24 horas. Es el primer instrumento de este tipo en un satélite geoestacionario operacional.',
    icon: <Radio size={16} />,
    docs: [
      {
        titulo: 'Hoja de Datos GLM — Geostationary Lightning Mapper',
        descripcion: 'Descripción del instrumento GLM: detección de rayos totales mediante óptica de alta sensibilidad, resolución espacial (~8 km), latencia de datos (<20 seg) y aplicaciones para el seguimiento de tormentas.',
        pdfUrl: 'https://www.goes-r.gov/education/docs/Factsheet_GLM.pdf',
        tag: 'Instrumento GLM',
      },
    ],
  },
  {
    id: 'spaceweather',
    titulo: 'Instrumentos de Clima Espacial',
    descripcion: 'El GOES-19 lleva a bordo múltiples instrumentos dedicados al monitoreo del clima espacial: magnetómetro, monitores de partículas energéticas, sensores de rayos X y ultravioleta solar.',
    icon: <Activity size={16} />,
    docs: [
      {
        titulo: 'Hoja de Datos — Instrumentos de Clima Espacial',
        descripcion: 'Descripción de los instrumentos de clima espacial del GOES-19: SEISS (sensor de electrones y protones), MAG (magnetómetro), EXIS (sensor de rayos X e irradiancia) y SUVI (imager ultravioleta solar).',
        pdfUrl: 'https://www.goes-r.gov/education/docs/Spaceweather.pdf',
        tag: 'Clima Espacial · Instrumentos',
      },
    ],
  },
  {
    id: 'comms',
    titulo: 'Servicios de Comunicaciones',
    descripcion: 'El GOES-19 provee servicios de comunicaciones de carga útil para la transmisión de datos ambientales y de emergencia.',
    icon: <Wifi size={16} />,
    docs: [
      {
        titulo: 'Servicios de Comunicaciones de Carga Útil (UPS)',
        descripcion: 'Descripción de los servicios de comunicaciones únicos del GOES-R: difusión de datos en tiempo real, retransmisión de datos de plataformas de recolección de datos (DCS) y servicios de emergencia.',
        pdfUrl: 'https://www.goes-r.gov/multimedia/factSheets/GOES-R_Series_UPSComms_fact_sheet.pdf',
        tag: 'Comunicaciones · UPS · DCS',
      },
    ],
  },
]

// ── Main component ────────────────────────────────────────────

export function DocumentationClient() {
  const [expandedBand, setExpandedBand] = useState<number | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [bandView, setBandView] = useState<'grid' | 'list'>('grid')

  return (
    <div className="space-y-8 pb-8">

      {/* ── Page header ── */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Documentación
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Documentos técnicos oficiales de la serie GOES-R · NOAA / CIMSS / SSEC
        </p>
      </div>

      {/* ── SECTION 1: Data Book ── */}
      <SectionBlock section={SECTIONS[0]} expanded={expandedSection} onToggle={setExpandedSection} />

      {/* ── SECTION 2: ABI Bands ── */}
      <div className="space-y-3">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-accent-cyan"><Zap size={16} /></span>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary">
              Bandas ABI — 16 Canales
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Type legend */}
            <div className="hidden items-center gap-3 md:flex">
              {Object.entries(TIPO_COLORS).map(([tipo, cls]) => (
                <span key={tipo} className={cn('badge border text-2xs', cls)}>{tipo}</span>
              ))}
            </div>
            {/* View toggle */}
            <div className="flex gap-1 rounded border border-border bg-background-secondary p-0.5">
              <button
                className={cn('rounded px-2 py-0.5 text-2xs transition-colors', bandView === 'grid' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary')}
                onClick={() => setBandView('grid')}
              >
                Grilla
              </button>
              <button
                className={cn('rounded px-2 py-0.5 text-2xs transition-colors', bandView === 'list' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary')}
                onClick={() => setBandView('list')}
              >
                Lista
              </button>
            </div>
          </div>
        </div>
        <p className="text-2xs text-text-muted">
          Guías de referencia rápida para cada banda del Generador de Imágenes de Línea de Base Avanzado (ABI).
          Hacé clic en una banda para ver su vista previa y descargar la guía completa.
        </p>

        {/* Band link */}
        <a
          href="https://www.goes-r.gov/mission/ABI-bands-quick-info.html"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded border border-border bg-background-card px-3 py-2 text-xs text-text-secondary hover:border-border-accent hover:text-text-primary transition-colors"
        >
          <ExternalLink size={11} className="text-accent-cyan" />
          <span>Ver resumen completo en goes-r.gov</span>
        </a>

        {bandView === 'grid' ? (
          <ABIBandGrid bands={ABI_BANDS} expandedBand={expandedBand} onExpand={setExpandedBand} />
        ) : (
          <ABIBandList bands={ABI_BANDS} />
        )}
      </div>

      {/* ── SECTION 2: ABI Fact Sheet ── */}
      <SectionBlock section={SECTIONS[1]} expanded={expandedSection} onToggle={setExpandedSection} />

      {/* ── SECTION 3: Applications ── */}
      <SectionBlock section={SECTIONS[2]} expanded={expandedSection} onToggle={setExpandedSection} />

      {/* ── SECTION 4: GLM ── */}
      <SectionBlock section={SECTIONS[3]} expanded={expandedSection} onToggle={setExpandedSection} />

      {/* ── SECTION 5: Space Weather ── */}
      <SectionBlock section={SECTIONS[4]} expanded={expandedSection} onToggle={setExpandedSection} />

      {/* ── SECTION 6: Communications ── */}
      <SectionBlock section={SECTIONS[5]} expanded={expandedSection} onToggle={setExpandedSection} />
    </div>
  )
}

// ── ABI Band Grid ─────────────────────────────────────────────

function ABIBandGrid({
  bands, expandedBand, onExpand,
}: {
  bands: ABIBand[]
  expandedBand: number | null
  onExpand: (n: number | null) => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {bands.map((band) => (
          <button
            key={band.numero}
            onClick={() => onExpand(expandedBand === band.numero ? null : band.numero)}
            className={cn(
              'group relative flex flex-col items-center gap-1.5 rounded-md border p-2.5 text-center',
              'transition-all duration-200 hover:scale-[1.03]',
              expandedBand === band.numero
                ? 'border-primary/60 bg-primary/10 shadow-glow-blue'
                : 'border-border bg-background-card hover:border-border-accent'
            )}
          >
            {/* Band number */}
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: band.color + '22', color: band.color, border: `1px solid ${band.color}44` }}
            >
              {band.numero}
            </span>
            {/* Wavelength */}
            <span className="font-data text-2xs font-medium tabular-nums text-text-primary">
              {band.longitud} µm
            </span>
            {/* Name */}
            <span className="text-2xs leading-tight text-text-muted">{band.nombre}</span>
            {/* Type badge */}
            <span className={cn('badge border text-2xs', TIPO_COLORS[band.tipo])}>
              {band.tipo === 'Visible' ? 'VIS' : band.tipo === 'Infrarrojo Cercano' ? 'NIR' : 'IR'}
            </span>
          </button>
        ))}
      </div>

      {/* Expanded band panel */}
      {expandedBand !== null && (() => {
        const band = bands.find((b) => b.numero === expandedBand)!
        return (
          <div
            className="grid gap-4 rounded-lg border border-primary/30 bg-background-card p-4 md:grid-cols-[200px_1fr]"
            style={{ borderColor: band.color + '44' }}
          >
            {/* PDF Thumbnail */}
            <div className="flex flex-col gap-2">
              <PDFThumbnail pdfUrl={band.pdfUrl} width={200} />
              <a
                href={band.pdfUrl}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded border border-border bg-background-secondary px-3 py-1.5 text-2xs text-text-secondary transition-colors hover:border-border-accent hover:text-text-primary"
              >
                <ExternalLink size={11} />
                Descargar guía PDF
              </a>
            </div>

            {/* Band info */}
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                      style={{ backgroundColor: band.color + '22', color: band.color, border: `1px solid ${band.color}55` }}
                    >
                      {band.numero}
                    </span>
                    <div>
                      <h3 className="font-display text-sm font-semibold text-text-primary">
                        Banda {band.numero} — {band.nombre}
                      </h3>
                      <p className="text-2xs text-text-muted">
                        Longitud de onda central: <span className="font-data text-text-secondary">{band.longitud} µm</span>
                      </p>
                    </div>
                  </div>
                </div>
                <span className={cn('badge border mt-1 shrink-0', TIPO_COLORS[band.tipo])}>
                  {band.tipo}
                </span>
              </div>

              {/* Use */}
              <div className="rounded-md border border-border bg-background-secondary p-3">
                <p className="text-2xs font-medium uppercase tracking-wider text-accent-cyan mb-1">
                  Uso Principal
                </p>
                <p className="text-xs text-text-secondary">{band.usoCorto}</p>
              </div>

              {/* Specs grid */}
              <div className="grid grid-cols-3 gap-2">
                <SpecCell label="Número de banda" value={`Canal ${band.numero}`} />
                <SpecCell label="Longitud de onda" value={`${band.longitud} µm`} />
                <SpecCell label="Tipo espectral" value={band.tipo} />
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-background-secondary p-2">
      <p className="text-2xs text-text-muted">{label}</p>
      <p className="font-data text-xs text-text-primary">{value}</p>
    </div>
  )
}

// ── ABI Band List ─────────────────────────────────────────────

function ABIBandList({ bands }: { bands: ABIBand[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-background-secondary text-left">
            <th className="px-3 py-2 font-medium text-text-muted">Banda</th>
            <th className="px-3 py-2 font-medium text-text-muted">Longitud de onda</th>
            <th className="px-3 py-2 font-medium text-text-muted">Nombre</th>
            <th className="px-3 py-2 font-medium text-text-muted">Tipo</th>
            <th className="hidden px-3 py-2 font-medium text-text-muted md:table-cell">Uso principal</th>
            <th className="px-3 py-2 font-medium text-text-muted">Guía</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((band, i) => (
            <tr
              key={band.numero}
              className={cn(
                'border-b border-border/50 transition-colors hover:bg-border/20',
                i % 2 === 0 ? 'bg-background-card' : 'bg-background'
              )}
            >
              <td className="px-3 py-2">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full font-data text-xs font-bold"
                  style={{ backgroundColor: band.color + '22', color: band.color, border: `1px solid ${band.color}44` }}
                >
                  {band.numero}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="font-data tabular-nums text-text-primary">{band.longitud} µm</span>
              </td>
              <td className="px-3 py-2 font-medium text-text-primary">{band.nombre}</td>
              <td className="px-3 py-2">
                <span className={cn('badge border text-2xs', TIPO_COLORS[band.tipo])}>
                  {band.tipo === 'Visible' ? 'VIS' : band.tipo === 'Infrarrojo Cercano' ? 'NIR' : 'IR'}
                </span>
              </td>
              <td className="hidden px-3 py-2 text-text-muted md:table-cell">{band.usoCorto}</td>
              <td className="px-3 py-2">
                <a
                  href={band.pdfUrl}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-accent-cyan hover:text-primary transition-colors"
                  title={`Guía banda ${band.numero}`}
                >
                  <FileText size={11} />
                  <span className="hidden sm:inline text-2xs">PDF</span>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Section Block ─────────────────────────────────────────────

function SectionBlock({
  section, expanded, onToggle,
}: {
  section: DocSection
  expanded: string | null
  onToggle: (id: string | null) => void
}) {
  const isExpanded = expanded === section.id || section.docs.length <= 2

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div
        className={cn(
          'flex items-start justify-between gap-2',
          section.docs.length > 2 && 'cursor-pointer'
        )}
        onClick={() => section.docs.length > 2 && onToggle(isExpanded ? null : section.id)}
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-accent-cyan">{section.icon}</span>
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary">
              {section.titulo}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">{section.descripcion}</p>
          </div>
        </div>
        {section.docs.length > 2 && (
          <button className="ctrl-btn mt-0.5 shrink-0">
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {/* Documents */}
      {isExpanded && (
        <div className={cn(
          'grid gap-3',
          section.docs.length === 1 ? 'grid-cols-1' :
          section.docs.length <= 2 ? 'md:grid-cols-2' :
          'md:grid-cols-2 xl:grid-cols-3'
        )}>
          {section.docs.map((doc) => (
            <DocCard key={doc.titulo} doc={doc} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Doc Card with PDF thumbnail ───────────────────────────────

function DocCard({ doc }: { doc: DocItem }) {
  return (
    <div className="card flex flex-col gap-3 transition-all hover:border-border-accent">
      {/* PDF thumbnail + info side by side for wide cards */}
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="shrink-0">
          <PDFThumbnail pdfUrl={doc.pdfUrl} width={110} className="rounded" />
        </div>
        {/* Info */}
        <div className="flex min-w-0 flex-col gap-2">
          <div>
            <p className="text-xs font-medium leading-snug text-text-primary">{doc.titulo}</p>
            <span className="mt-1 inline-block rounded border border-border bg-background px-1.5 py-0.5 text-2xs text-text-dim">
              {doc.tag}
            </span>
          </div>
          <p className="text-2xs leading-relaxed text-text-muted line-clamp-4">{doc.descripcion}</p>
        </div>
      </div>
      {/* Actions */}
      <div className="flex gap-2 border-t border-border pt-2">
        <a
          href={doc.pdfUrl}
          target="_blank" rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded border border-border bg-background-secondary
                     px-3 py-1.5 text-2xs text-text-secondary transition-colors
                     hover:border-primary/50 hover:text-primary"
        >
          <ExternalLink size={11} />
          Ver / Descargar PDF
        </a>
      </div>
    </div>
  )
}
