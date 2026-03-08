'use client'
// ============================================================
// src/components/dashboard/DashboardClient.tsx
// Main dashboard with real-time status cards
// ============================================================
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { Activity, Satellite, Zap, Wind, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ── Types ──

interface XRayReading {
  time_tag: string
  satellite: number
  flux: number
  observed_flux: number
  energy: string
}

interface ProtonReading {
  time_tag: string
  satellite: number
  flux: number
  energy: string
}

interface KpSample {
  time_tag: string
  kp: number
  a_running: number
  station_count: number
}

interface SatelliteStatusRow {
  name: string
  role: string
  color: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLUE' | 'UNKNOWN'
}

interface GOESStatusResponse {
  satellites: SatelliteStatusRow[]
  anomalies: { title: string; satellite: string; type: string }[]
}

// ── Helpers ──

function classifyXRay(flux: number): { label: string; color: string } {
  if (flux >= 1e-4) {
    const n = flux / 1e-4
    return { label: `X${n >= 10 ? n.toFixed(0) : n.toFixed(1)}`, color: 'text-red-500' }
  }
  if (flux >= 1e-5) {
    const n = flux / 1e-5
    return { label: `M${n >= 10 ? n.toFixed(0) : n.toFixed(1)}`, color: 'text-accent-orange' }
  }
  if (flux >= 1e-6) {
    const n = flux / 1e-6
    return { label: `C${n >= 10 ? n.toFixed(0) : n.toFixed(1)}`, color: 'text-yellow-400' }
  }
  if (flux >= 1e-7) {
    const n = flux / 1e-7
    return { label: `B${n >= 10 ? n.toFixed(0) : n.toFixed(1)}`, color: 'text-blue-400' }
  }
  const n = flux / 1e-8
  return { label: `A${n >= 10 ? n.toFixed(0) : n.toFixed(1)}`, color: 'text-green-400' }
}

function kpDescription(kp: number): { sub: string; color: string } {
  if (kp >= 8) return { sub: 'Extrema (G4–G5)', color: 'text-red-500' }
  if (kp >= 7) return { sub: 'Severa (G4)', color: 'text-accent-red' }
  if (kp >= 6) return { sub: 'Fuerte (G3)', color: 'text-accent-orange' }
  if (kp >= 5) return { sub: 'Tormenta menor (G1–G2)', color: 'text-yellow-400' }
  if (kp >= 4) return { sub: 'Activo', color: 'text-yellow-300' }
  if (kp >= 2) return { sub: 'Sin perturbar', color: 'text-green-400' }
  return { sub: 'Quieto', color: 'text-green-400' }
}

function goesStatusLabel(color: string): { label: string; statusColor: string; sub: string } {
  switch (color) {
    case 'GREEN':  return { label: 'NOMINAL', statusColor: 'text-green-400', sub: 'Instrumentos operativos' }
    case 'YELLOW': return { label: 'PRECAUCIÓN', statusColor: 'text-yellow-400', sub: 'Anomalía menor reportada' }
    case 'ORANGE': return { label: 'DEGRADADO', statusColor: 'text-accent-orange', sub: 'Rendimiento degradado' }
    case 'RED':    return { label: 'CRÍTICO', statusColor: 'text-red-500', sub: 'Interrupción de servicio' }
    default:       return { label: 'DESCONOCIDO', statusColor: 'text-text-muted', sub: 'Estado no disponible' }
  }
}

// ── Data fetchers ──

const fetchXRay = (): Promise<XRayReading[]> =>
  fetch('/api/swpc/xray-flux?range=1-day').then((r) => r.json()).then((d) => Array.isArray(d) ? d : [])

const fetchProtons = (): Promise<ProtonReading[]> =>
  fetch('/api/swpc/proton-flux?range=1-day').then((r) => r.json()).then((d) => Array.isArray(d) ? d : [])

const fetchKp = (): Promise<KpSample[]> =>
  fetch('/api/swpc/kp-index').then((r) => r.json()).then((d) => Array.isArray(d) ? d : [])

const fetchGOESStatus = (): Promise<GOESStatusResponse> =>
  fetch('/api/goes/status').then((r) => r.json())

// ── Component ──

export function DashboardClient() {
  const { data: xrayData } = useAutoRefresh<XRayReading[]>({
    queryKey: ['dashboard-xray'],
    fetcher: fetchXRay,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  const { data: protonData } = useAutoRefresh<ProtonReading[]>({
    queryKey: ['dashboard-protons'],
    fetcher: fetchProtons,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  const { data: kpData } = useAutoRefresh<KpSample[]>({
    queryKey: ['dashboard-kp'],
    fetcher: fetchKp,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  const { data: goesData } = useAutoRefresh<GOESStatusResponse>({
    queryKey: ['dashboard-goes-status'],
    fetcher: fetchGOESStatus,
    intervalMs: REFRESH_INTERVALS.STATUS,
  })

  // ── Derive card values ──

  // X-Ray: get latest 0.1-0.8nm (long) reading
  const latestXRay = xrayData
    ?.filter((d) => d.energy === '0.1-0.8nm')
    ?.at(-1)
  const xray = latestXRay ? classifyXRay(latestXRay.flux) : null

  // Proton flux: get latest ≥10 MeV reading
  const latestProton = protonData
    ?.filter((d) => d.energy === '>=10 MeV')
    ?.at(-1)
  const protonValue = latestProton ? latestProton.flux : null
  const protonColor = protonValue !== null
    ? protonValue >= 100 ? 'text-red-500'
      : protonValue >= 10 ? 'text-accent-orange'
      : protonValue >= 1 ? 'text-yellow-400'
      : 'text-blue-400'
    : 'text-text-muted'

  // Kp index: latest value
  const latestKp = kpData?.at(-1)
  const kp = latestKp ? kpDescription(latestKp.kp) : null

  // GOES-19 status
  const goes19 = goesData?.satellites?.find((s) => s.name.includes('19'))
  const goesStatus = goes19 ? goesStatusLabel(goes19.color) : null

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Monitor de Clima Espacial
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          GOES-19 · Datos en Tiempo Real NOAA/SWPC · Sector Sudamérica
        </p>
      </div>

      {/* Quick status cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatusCard
          label="Clase Rayos X"
          value={xray?.label ?? '—'}
          sub="Onda corta 0.1–0.8 nm"
          color={xray?.color ?? 'text-text-muted'}
          icon={<Zap size={14} />}
          href="/instruments/xray-flux"
          loading={!xrayData}
        />
        <StatusCard
          label="Flujo de Protones"
          value={protonValue !== null ? protonValue.toFixed(2) : '—'}
          sub="≥10 MeV pfu"
          color={protonColor}
          icon={<Activity size={14} />}
          href="/instruments/proton-flux"
          loading={!protonData}
        />
        <StatusCard
          label="Índice Kp"
          value={latestKp ? latestKp.kp.toFixed(1) : '—'}
          sub={kp?.sub ?? 'Cargando…'}
          color={kp?.color ?? 'text-text-muted'}
          icon={<Globe size={14} />}
          href="/instruments/kp-index"
          loading={!kpData}
        />
        <StatusCard
          label="GOES-19"
          value={goesStatus?.label ?? '—'}
          sub={goesStatus?.sub ?? 'Consultando estado…'}
          color={goesStatus?.statusColor ?? 'text-text-muted'}
          icon={<Satellite size={14} />}
          href="/satellite-status"
          loading={!goesData}
        />
      </div>

      {/* Quick links grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <QuickLink
          title="Imágenes ABI"
          description="16 canales · Loop de 10 minutos · Disco Completo y Sudamérica"
          href="/imagery"
          icon={<Satellite size={18} />}
          color="text-accent-cyan"
        />
        <QuickLink
          title="Flujo de Rayos X"
          description="Monitoreo de llamaradas solares · Actualización cada 1 minuto"
          href="/instruments/xray-flux"
          icon={<Zap size={18} />}
          color="text-accent-amber"
        />
        <QuickLink
          title="Magnetómetro"
          description="Componentes Hp, He, Hn · Detección de tormentas geomagnéticas"
          href="/instruments/magnetometer"
          icon={<Activity size={18} />}
          color="text-primary"
        />
        <QuickLink
          title="Pronóstico de Aurora"
          description="Pronóstico de aurora 30 minutos · Polos Norte y Sur"
          href="/aurora"
          icon={<Wind size={18} />}
          color="text-purple-400"
        />
        <QuickLink
          title="Coronógrafo"
          description="Detección de CMEs · CCOR-1, LASCO C2 y C3"
          href="/instruments/coronagraph"
          icon={<Globe size={18} />}
          color="text-accent-teal"
        />
        <QuickLink
          title="Viento Solar"
          description="Modelo de predicción WSA-ENLIL · Propagación del viento solar"
          href="/solar-wind"
          icon={<Wind size={18} />}
          color="text-accent-orange"
        />
      </div>

      {/* Getting started note */}
      <div className="rounded-md border border-border bg-background-card p-4">
        <p className="section-label mb-2">Cómo usar</p>
        <p className="text-xs text-text-secondary">
          Usá el menú lateral para navegar entre secciones. Todos los paneles se actualizan
          automáticamente según el intervalo de cada instrumento. Los gráficos son interactivos
          — pasá el mouse para ver valores, arrastrá para hacer zoom y usá el selector de rango
          temporal para cambiar el período visualizado.
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ──

interface StatusCardProps {
  label: string
  value: string
  sub: string
  color: string
  icon: React.ReactNode
  href: string
  loading?: boolean
}

function StatusCard({ label, value, sub, color, icon, href, loading }: StatusCardProps) {
  return (
    <Link
      href={href}
      className="card flex flex-col gap-2 transition-all hover:border-border-accent hover:shadow-glow-blue"
    >
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
          <span className="text-2xs text-text-muted">Cargando…</span>
        </div>
      ) : (
        <span className={cn('font-display text-xl font-bold', color)}>{value}</span>
      )}
      <span className="text-2xs text-text-muted">{sub}</span>
    </Link>
  )
}

interface QuickLinkProps {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color: string
}

function QuickLink({ title, description, href, icon, color }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="card flex items-start gap-3 transition-all hover:border-border-accent hover:shadow-glow-blue"
    >
      <div className={`mt-0.5 shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="font-display text-xs font-semibold text-text-primary">{title}</p>
        <p className="mt-0.5 text-2xs text-text-muted">{description}</p>
      </div>
    </Link>
  )
}
