'use client'
// ============================================================
// src/components/layout/SpaceWeatherBar.tsx
// Expandable "Current Space Weather Conditions" banner
// Mirrors SWPC NOAA scales: R (Radio), S (Solar), G (Geomagnetic)
// ============================================================
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { create } from 'zustand'

// ── Shared open/close state ──
const useConditionsStore = create<{ open: boolean; toggle: () => void }>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
}))

interface ScaleEntry {
  Scale: string | null
  Text: string | null
  MinorProb?: string | null
  MajorProb?: string | null
  Prob?: string | null
}

interface DayData {
  DateStamp: string
  TimeStamp: string
  R: ScaleEntry
  S: ScaleEntry
  G: ScaleEntry
}

type NoaaScales = Record<string, DayData>

const SCALE_COLORS: Record<string, { bg: string; text: string }> = {
  '0': { bg: 'bg-accent-green/20', text: 'text-accent-green' },
  '1': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  '2': { bg: 'bg-accent-amber/20', text: 'text-accent-amber' },
  '3': { bg: 'bg-accent-orange/20', text: 'text-accent-orange' },
  '4': { bg: 'bg-accent-red/20', text: 'text-accent-red' },
  '5': { bg: 'bg-red-600/20', text: 'text-red-500' },
}

function scaleColor(level: string | null) {
  return SCALE_COLORS[level ?? '0'] ?? SCALE_COLORS['0']
}

const TYPE_LABELS: Record<string, string> = {
  R: 'Radio Blackout',
  S: 'Tormenta de Radiación Solar',
  G: 'Tormenta Geomagnética',
}

const SCALE_DESCRIPTIONS: Record<string, Record<string, string>> = {
  R: {
    '0': 'Sin tormentas',
    '1': 'Menor — Degradación menor de señales HF',
    '2': 'Moderada — Apagones HF limitados',
    '3': 'Fuerte — Apagones HF extendidos',
    '4': 'Severa — Apagones HF en la mayor parte del lado iluminado',
    '5': 'Extrema — Apagón total de HF en el lado iluminado',
  },
  S: {
    '0': 'Sin tormentas',
    '1': 'Menor — Impacto menor en operaciones de satélites',
    '2': 'Moderada — Efectos en satélites, degradación de HF en polos',
    '3': 'Fuerte — Dosis de radiación elevada en aviación polar',
    '4': 'Severa — Riesgo de radiación significativo',
    '5': 'Extrema — Riesgo de radiación muy alto para astronautas',
  },
  G: {
    '0': 'Sin tormentas',
    '1': 'Menor — Fluctuaciones débiles en redes eléctricas',
    '2': 'Moderada — Posibles alertas de voltaje en sistemas eléctricos',
    '3': 'Fuerte — Correcciones de voltaje necesarias, auroras visibles',
    '4': 'Severa — Problemas generalizados en control de voltaje',
    '5': 'Extrema — Colapso potencial de redes eléctricas',
  },
}

function fetchScales(): Promise<NoaaScales> {
  return fetch('/api/swpc/noaa-scales').then((r) => {
    if (!r.ok) throw new Error('fetch failed')
    return r.json()
  })
}

/** Shared hook — call from TopBar and SpaceWeatherBar */
export function useNoaaScales() {
  return useAutoRefresh<NoaaScales>({
    queryKey: ['noaa-scales'],
    fetcher: fetchScales,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })
}

// ── Solar Wind Speed ──

interface SolarWindSpeed {
  WindSpeed: string
  TimeStamp: string
}

function fetchWindSpeed(): Promise<SolarWindSpeed> {
  return fetch('/api/swpc/solar-wind-speed').then((r) => {
    if (!r.ok) throw new Error('fetch failed')
    return r.json()
  })
}

export function useSolarWindSpeed() {
  return useAutoRefresh<SolarWindSpeed>({
    queryKey: ['solar-wind-speed'],
    fetcher: fetchWindSpeed,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })
}

// ── Pills for the TopBar ──

export function SpaceWeatherPills() {
  const { data } = useNoaaScales()
  const { data: wind } = useSolarWindSpeed()
  const { open, toggle } = useConditionsStore()

  const current = data?.['0']
  const rLevel = current?.R.Scale ?? '0'
  const sLevel = current?.S.Scale ?? '0'
  const gLevel = current?.G.Scale ?? '0'
  const windSpeed = wind?.WindSpeed

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-border/30"
      title="Condiciones de Clima Espacial"
    >
      <span className="section-label text-text-muted whitespace-nowrap">Condiciones Actuales</span>
      <ScalePill type="R" level={rLevel} />
      <ScalePill type="S" level={sLevel} />
      <ScalePill type="G" level={gLevel} />
      <span className="h-4 w-px bg-border" />
      <WindSpeedPill speed={windSpeed} />
      {open
        ? <ChevronUp size={11} className="text-text-muted ml-0.5" />
        : <ChevronDown size={11} className="text-text-muted ml-0.5" />}
    </button>
  )
}

// ── Expandable detail panel (below TopBar) ──

export function SpaceWeatherBar() {
  const { data } = useNoaaScales()
  const { open } = useConditionsStore()

  if (!open) return null

  const current = data?.['0']
  const day1 = data?.['1']
  const day2 = data?.['2']
  const day3 = data?.['3']

  return (
    <div className="border-b border-border bg-background-secondary px-4 pb-3 pt-2">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(['R', 'S', 'G'] as const).map((type) => (
          <ScaleCard
            key={type}
            type={type}
            current={current}
            day1={day1}
            day2={day2}
            day3={day3}
          />
        ))}
      </div>
    </div>
  )
}

function ScalePill({ type, level }: { type: string; level: string | null }) {
  const c = scaleColor(level)
  const n = level ?? '0'
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-bold', c.bg, c.text)}>
      {type}{n}
    </span>
  )
}

function WindSpeedPill({ speed }: { speed?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-accent-cyan/15 px-1.5 py-0.5 text-2xs font-bold text-accent-cyan">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>
      {speed ? `${speed} km/s` : '— km/s'}
    </span>
  )
}

function ScaleCard({
  type,
  current,
  day1,
  day2,
  day3,
}: {
  type: 'R' | 'S' | 'G'
  current?: DayData
  day1?: DayData
  day2?: DayData
  day3?: DayData
}) {
  const level = current?.[type].Scale ?? '0'
  const c = scaleColor(level)
  const desc = SCALE_DESCRIPTIONS[type][level] ?? ''

  return (
    <div className="rounded-md border border-border bg-background-card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="section-label">{TYPE_LABELS[type]}</span>
        <span className={cn('rounded px-1.5 py-0.5 text-2xs font-bold', c.bg, c.text)}>
          {level === '0' ? 'Normal' : `${type}${level}`}
        </span>
      </div>

      <p className="text-2xs text-text-secondary mb-2">{desc}</p>

      {/* Forecast row */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-2xs text-text-dim">Pronóstico:</span>
        <ForecastDay label="Hoy" data={day1?.[type]} type={type} />
        <ForecastDay label={day2?.DateStamp?.slice(5) ?? '—'} data={day2?.[type]} type={type} />
        <ForecastDay label={day3?.DateStamp?.slice(5) ?? '—'} data={day3?.[type]} type={type} />
      </div>

      {/* Probabilities for R and S */}
      {type === 'R' && day1?.R.MinorProb && (
        <div className="mt-1.5 flex gap-3 text-2xs text-text-dim">
          <span>Prob. menor: {day1.R.MinorProb}%</span>
          <span>Prob. mayor: {day1.R.MajorProb}%</span>
        </div>
      )}
      {type === 'S' && day1?.S.Prob && (
        <div className="mt-1.5 text-2xs text-text-dim">
          Prob. tormenta: {day1.S.Prob}%
        </div>
      )}
    </div>
  )
}

function ForecastDay({
  label,
  data,
  type,
}: {
  label: string
  data?: ScaleEntry
  type: string
}) {
  const level = data?.Scale ?? '0'
  const c = scaleColor(level)
  return (
    <div className="flex items-center gap-1">
      <span className="text-2xs text-text-dim">{label}</span>
      <span className={cn('inline-block h-2 w-2 rounded-full', level === '0' ? 'bg-accent-green/60' : c.bg.replace('/20', ''))}
        title={`${type}${level}`}
      />
    </div>
  )
}
