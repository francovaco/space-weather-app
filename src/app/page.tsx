// ============================================================
// src/app/page.tsx — Main dashboard
// ============================================================
import type { Metadata } from 'next'
import { Activity, Satellite, Zap, Wind, Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Panel Principal',
}

export default function DashboardPage() {
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
          value="C2.1"
          sub="Onda corta"
          color="text-yellow-400"
          icon={<Zap size={14} />}
          href="/instruments/xray-flux"
        />
        <StatusCard
          label="Flujo de Protones"
          value="0.12"
          sub=">10 MeV pfu"
          color="text-blue-400"
          icon={<Activity size={14} />}
          href="/instruments/proton-flux"
        />
        <StatusCard
          label="Índice Kp"
          value="2"
          sub="Tranquilo"
          color="text-green-400"
          icon={<Globe size={14} />}
          href="/instruments/magnetometer"
        />
        <StatusCard
          label="GOES-19"
          value="OPER"
          sub="Todos los instrumentos nominales"
          color="text-green-400"
          icon={<Satellite size={14} />}
          href="/satellite-status"
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

// ---- Sub-components ----

interface StatusCardProps {
  label: string
  value: string
  sub: string
  color: string
  icon: React.ReactNode
  href: string
}

function StatusCard({ label, value, sub, color, icon, href }: StatusCardProps) {
  return (
    <a
      href={href}
      className="card flex flex-col gap-2 transition-all hover:border-border-accent hover:shadow-glow-blue"
    >
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <span className={`font-display text-xl font-bold ${color}`}>{value}</span>
      <span className="text-2xs text-text-muted">{sub}</span>
    </a>
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
    <a
      href={href}
      className="card flex items-start gap-3 transition-all hover:border-border-accent hover:shadow-glow-blue"
    >
      <div className={`mt-0.5 shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="font-display text-xs font-semibold text-text-primary">{title}</p>
        <p className="mt-0.5 text-2xs text-text-muted">{description}</p>
      </div>
    </a>
  )
}
