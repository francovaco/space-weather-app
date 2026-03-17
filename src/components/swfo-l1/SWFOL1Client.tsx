'use client'
// ============================================================
// src/components/swfo-l1/SWFOL1Client.tsx
// Próximamente — SWFO-L1 / NOAA Solar-1
// Placeholder hasta que el satélite entre en operaciones (mid-2026)
// ============================================================
import { useState, useEffect } from 'react'
import {
  Satellite, Clock, Radio, Zap, Wind, Magnet,
  Eye, FlaskConical, AlertTriangle, ExternalLink, Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Fecha objetivo de operaciones: julio 2026
const OPERATIONS_TARGET = new Date('2026-07-01T00:00:00Z')

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function useCountdown(target: Date): TimeLeft {
  const [left, setLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calc = (): TimeLeft => {
      const diff = Math.max(0, target.getTime() - Date.now())
      return {
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
      }
    }
    setLeft(calc())
    const id = setInterval(() => setLeft(calc()), 1000)
    return () => clearInterval(id)
  }, [target])

  return left
}

function CountUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-accent-cyan/30 bg-accent-cyan/5 font-display text-2xl font-bold tabular-nums text-accent-cyan shadow-glow-cyan sm:h-20 sm:w-20 sm:text-3xl">
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-2xs uppercase tracking-widest text-text-muted">{label}</span>
    </div>
  )
}

interface InstrumentCardProps {
  icon: React.ReactNode
  name: string
  full: string
  description: string
  measures: string[]
  color: string
}

function InstrumentCard({ icon, name, full, description, measures, color }: InstrumentCardProps) {
  return (
    <div className="rounded-lg border border-border bg-background-secondary p-4 space-y-2.5">
      <div className="flex items-center gap-2.5">
        <span style={{ color }} className="shrink-0">{icon}</span>
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-wider text-text-primary">{name}</p>
          <p className="text-2xs text-text-muted">{full}</p>
        </div>
      </div>
      <p className="text-2xs leading-relaxed text-text-secondary">{description}</p>
      <ul className="space-y-0.5">
        {measures.map((m) => (
          <li key={m} className="flex items-start gap-1.5 text-2xs text-text-muted">
            <span className="mt-0.5 shrink-0" style={{ color }}>›</span>
            <span>{m}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const INSTRUMENTS: InstrumentCardProps[] = [
  {
    icon: <Wind size={16} />,
    name: 'SWS',
    full: 'Solar Wind Sensor',
    description: 'Sensor de plasma de viento solar de nueva generación, sucesor del instrumento Faraday Cup del DSCOVR.',
    measures: [
      'Velocidad del viento solar (km/s)',
      'Densidad de protones (p/cm³)',
      'Temperatura del plasma',
    ],
    color: '#22d3ee',
  },
  {
    icon: <Magnet size={16} />,
    name: 'MAG',
    full: 'Fluxgate Magnetometer',
    description: 'Magnetómetro vectorial de alta precisión para medir el campo magnético interplanetario (IMF) en L1.',
    measures: [
      'Componentes Bx, By, Bz del IMF (nT)',
      'Magnitud total del campo |B|',
      'Orientación del IMF (latitud/longitud GSM)',
    ],
    color: '#a78bfa',
  },
  {
    icon: <Zap size={16} />,
    name: 'EPI-Lo',
    full: 'Energetic Particle Instrument — Low Energy',
    description: 'Detector de partículas energéticas para vigilancia de tormentas de radiación solar (escala S de NOAA).',
    measures: [
      'Flujo de protones energéticos (MeV)',
      'Flujo de electrones (keV–MeV)',
      'Índice de tormenta de radiación (S1–S5)',
    ],
    color: '#fb923c',
  },
  {
    icon: <Eye size={16} />,
    name: 'CCOR-2',
    full: 'Compact Coronagraph — 2',
    description: 'Coronógrafo compacto de segunda generación montado en L1, complementando al CCOR-1 a bordo del GOES-19.',
    measures: [
      'Imágenes de CMEs (campo visual ~3–17 R☉)',
      'Velocidad y dirección de eyecciones coronales',
      'Tiempos de arribo de CMEs a la Tierra',
    ],
    color: '#34d399',
  },
]

const TIMELINE = [
  { date: 'Mar 2025', label: 'Lanzamiento', done: true },
  { date: 'Abr–Jun 2025', label: 'Puesta en órbita L1', done: true },
  { date: 'Jul–Dic 2025', label: 'Comisionamiento de instrumentos', done: false, active: true },
  { date: 'Ene–Jun 2026', label: 'Pruebas y validación de datos', done: false },
  { date: 'Mid-2026', label: 'Operaciones plenas · Datos disponibles', done: false, highlight: true },
]

export function SWFOL1Client() {
  const { days, hours, minutes, seconds } = useCountdown(OPERATIONS_TARGET)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
              SWFO-L1 · NOAA Solar-1
            </h1>
            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-display text-2xs font-bold uppercase tracking-widest text-amber-400">
              Próximamente
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Space Weather Follow On — Lagrange 1 · NOAA · Punto L1 Sol-Tierra
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded border border-border bg-background-secondary px-3 py-1.5">
          <AlertTriangle size={12} className="text-amber-400" />
          <span className="text-2xs text-text-muted">
            Datos aún no disponibles · Operaciones previstas <strong className="text-text-secondary">mid-2026</strong>
          </span>
        </div>
      </div>

      {/* Countdown */}
      <div className="rounded-xl border border-accent-cyan/20 bg-gradient-to-br from-accent-cyan/5 to-transparent p-6">
        <p className="mb-4 text-center font-display text-xs uppercase tracking-widest text-text-muted">
          Tiempo estimado para inicio de operaciones
        </p>
        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <CountUnit value={days} label="Días" />
          <span className="mb-5 font-display text-xl font-bold text-accent-cyan/40">:</span>
          <CountUnit value={hours} label="Horas" />
          <span className="mb-5 font-display text-xl font-bold text-accent-cyan/40">:</span>
          <CountUnit value={minutes} label="Min" />
          <span className="mb-5 font-display text-xl font-bold text-accent-cyan/40">:</span>
          <CountUnit value={seconds} label="Seg" />
        </div>
        <p className="mt-4 text-center text-2xs text-text-dim">
          Fecha estimada: julio 2026 · Sujeto a cambios por NOAA
        </p>
      </div>

      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-background-secondary p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Satellite size={16} className="text-accent-cyan" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-text-primary">
              Sobre el satélite
            </span>
          </div>
          <div className="space-y-2 text-2xs leading-relaxed text-text-secondary">
            <p>
              El <strong className="text-text-primary">SWFO-L1</strong> (Space Weather Follow On — Lagrange 1) es la próxima nave espacial de NOAA destinada a monitorear el viento solar y el campo magnético interplanetario (IMF) desde el punto de Lagrange L1, ubicado a ~1.5 millones de km de la Tierra.
            </p>
            <p>
              Sucesor y suplemento del <strong className="text-text-primary">DSCOVR</strong> (actualmente en operaciones), el SWFO-L1 proveerá alertas tempranas de tormentas geomagnéticas con 15–60 minutos de anticipación, mejorando la precisión gracias a instrumentos de última generación.
            </p>
            <p>
              Sus datos serán fundamentales para la predicción de auroras, protección de redes eléctricas e infraestructura crítica en tierra.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background-secondary p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-accent-cyan" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-text-primary">
              Ficha técnica
            </span>
          </div>
          <dl className="space-y-2">
            {[
              { k: 'Agencia', v: 'NOAA · NASA (lanzamiento)' },
              { k: 'Órbita', v: 'Halo en L1 Sol-Tierra' },
              { k: 'Distancia', v: '~1.5 millones de km (Tierra)' },
              { k: 'Antelación de alerta', v: '15–60 minutos' },
              { k: 'Vida útil', v: '7 años (diseño)' },
              { k: 'Actualización datos', v: 'Cada 1 minuto (proyectado)' },
              { k: 'Relación con GOES-19', v: 'Complementario (L1 vs. GEO)' },
            ].map(({ k, v }) => (
              <div key={k} className="flex justify-between gap-2 text-2xs">
                <dt className="text-text-muted shrink-0">{k}</dt>
                <dd className="text-right text-text-secondary font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-border bg-background-secondary p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} className="text-accent-cyan" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-text-primary">
            Línea de tiempo
          </span>
        </div>
        <ol className="relative border-l border-border ml-2 space-y-4">
          {TIMELINE.map(({ date, label, done, active, highlight }) => (
            <li key={label} className="ml-5">
              <span
                className={cn(
                  'absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full border',
                  done
                    ? 'border-green-500 bg-green-500/20'
                    : active
                      ? 'border-amber-400 bg-amber-400/20 animate-pulse'
                      : highlight
                        ? 'border-accent-cyan bg-accent-cyan/20'
                        : 'border-border bg-background',
                )}
              />
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={cn(
                    'font-data text-2xs font-bold',
                    done ? 'text-green-400' : active ? 'text-amber-400' : highlight ? 'text-accent-cyan' : 'text-text-muted',
                  )}
                >
                  {date}
                </span>
                <span
                  className={cn(
                    'text-2xs',
                    done
                      ? 'text-text-secondary'
                      : active
                        ? 'text-amber-300'
                        : highlight
                          ? 'font-semibold text-accent-cyan'
                          : 'text-text-muted',
                  )}
                >
                  {label}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Instruments */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Radio size={15} className="text-accent-cyan" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-text-primary">
            Instrumentos previstos
          </span>
          <span className="text-2xs text-text-muted">— se integrarán en esta sección al activarse</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {INSTRUMENTS.map((inst) => (
            <InstrumentCard key={inst.name} {...inst} />
          ))}
        </div>
      </div>

      {/* What will appear here */}
      <div className="rounded-lg border border-dashed border-accent-cyan/30 bg-accent-cyan/5 p-4">
        <div className="flex items-start gap-3">
          <Globe size={16} className="mt-0.5 shrink-0 text-accent-cyan" />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-text-primary">¿Qué mostrará esta sección?</p>
            <p className="text-2xs leading-relaxed text-text-secondary">
              Cuando el SWFO-L1 entre en operaciones, esta página se actualizará automáticamente para mostrar datos en tiempo real del viento solar, IMF, partículas energéticas y coronógrafo — reemplazando este placeholder con gráficas interactivas y alertas tempranas idénticas al formato actual de DSCOVR.
            </p>
          </div>
        </div>
      </div>

      {/* DSCOVR fallback note */}
      <div className="rounded-lg border border-border bg-background-secondary p-3">
        <p className="text-2xs text-text-muted leading-relaxed">
          <strong className="text-text-secondary">Mientras tanto:</strong> los datos de viento solar e IMF actuales provienen del{' '}
          <strong className="text-text-primary">DSCOVR</strong>, actualmente operativo en L1. Podés consultarlos en{' '}
          <a href="/instruments/dscovr" className="text-accent-cyan hover:underline">
            Magnetómetro DSCOVR
          </a>{' '}
          y{' '}
          <a href="/solar-wind" className="text-accent-cyan hover:underline">
            Viento Solar
          </a>
          .
          <a
            href="https://www.nesdis.noaa.gov/space-weather-follow-on-l1"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 inline-flex items-center gap-1 text-accent-cyan hover:underline"
          >
            Info oficial NOAA <ExternalLink size={10} />
          </a>
        </p>
      </div>
    </div>
  )
}
