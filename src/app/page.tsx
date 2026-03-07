// ============================================================
// src/app/page.tsx — Main dashboard
// ============================================================
import type { Metadata } from 'next'
import { Activity, Satellite, Zap, Wind, Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Space Weather Monitor
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          GOES-19 · NOAA/SWPC Real-Time Data · South America Sector
        </p>
      </div>

      {/* Quick status cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatusCard
          label="X-Ray Class"
          value="C2.1"
          sub="Short wave"
          color="text-yellow-400"
          icon={<Zap size={14} />}
          href="/instruments/xray-flux"
        />
        <StatusCard
          label="Proton Flux"
          value="0.12"
          sub=">10 MeV pfu"
          color="text-blue-400"
          icon={<Activity size={14} />}
          href="/instruments/proton-flux"
        />
        <StatusCard
          label="Kp Index"
          value="2"
          sub="Quiet"
          color="text-green-400"
          icon={<Globe size={14} />}
          href="/instruments/magnetometer"
        />
        <StatusCard
          label="GOES-19"
          value="OPER"
          sub="All instruments nominal"
          color="text-green-400"
          icon={<Satellite size={14} />}
          href="/satellite-status"
        />
      </div>

      {/* Quick links grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <QuickLink
          title="ABI Imagery"
          description="16 channels · 10-min loop · Full Disk & South America"
          href="/imagery"
          icon={<Satellite size={18} />}
          color="text-accent-cyan"
        />
        <QuickLink
          title="X-Ray Flux"
          description="Solar flare monitoring · Updates every 1 minute"
          href="/instruments/xray-flux"
          icon={<Zap size={18} />}
          color="text-accent-amber"
        />
        <QuickLink
          title="Magnetometer"
          description="Hp, He, Hn components · Geomagnetic storm detection"
          href="/instruments/magnetometer"
          icon={<Activity size={18} />}
          color="text-primary"
        />
        <QuickLink
          title="Aurora Forecast"
          description="30-minute aurora forecast · North & South poles"
          href="/aurora"
          icon={<Wind size={18} />}
          color="text-purple-400"
        />
        <QuickLink
          title="Coronagraph"
          description="CME detection · CCOR-1, LASCO C2 & C3"
          href="/instruments/coronagraph"
          icon={<Globe size={18} />}
          color="text-accent-teal"
        />
        <QuickLink
          title="Solar Wind"
          description="WSA-ENLIL prediction model · Solar wind propagation"
          href="/solar-wind"
          icon={<Wind size={18} />}
          color="text-accent-orange"
        />
      </div>

      {/* Getting started note */}
      <div className="rounded-md border border-border bg-background-card p-4">
        <p className="section-label mb-2">Getting Started</p>
        <p className="text-xs text-text-secondary">
          Use the sidebar to navigate between sections. All data panels refresh automatically
          according to their respective update schedules. Charts are interactive — hover to see
          values, drag to zoom, and use the time range selector to change the displayed period.
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
      className="card flex flex-col gap-2 transition-colors hover:border-border-accent"
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
