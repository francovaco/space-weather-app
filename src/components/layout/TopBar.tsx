'use client'
// ============================================================
// src/components/layout/TopBar.tsx — Header with dual clocks
// ============================================================
import { useClocks } from '@/hooks/useClocks'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { Menu, Satellite } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'

export function TopBar() {
  const { utc, local, localTimezone, localOffset } = useClocks()
  const { toggleSidebar } = useUIStore()

  const utcStr = formatInTimeZone(utc, 'UTC', 'HH:mm:ss')
  const utcDate = formatInTimeZone(utc, 'UTC', 'yyyy-MM-dd')

  const localStr = formatInTimeZone(local, localTimezone, 'HH:mm:ss')
  const localDate = formatInTimeZone(local, localTimezone, 'yyyy-MM-dd')
  const localTz = localOffset

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background-secondary px-4">
      {/* Left: Menu toggle + branding */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="ctrl-btn"
          aria-label="Alternar barra lateral"
        >
          <Menu size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Satellite size={14} className="text-accent-cyan" />
          <span className="font-display text-xs font-semibold tracking-widest text-text-primary uppercase">
            GOES-19
          </span>
          <span className="text-2xs text-text-muted">Clima Espacial</span>
        </div>
      </div>

      {/* Center: Live indicator */}
      <div className="flex items-center gap-2">
        <span className="live-dot" />
        <span className="text-2xs font-medium text-green-400 uppercase tracking-wider">En vivo</span>
      </div>

      {/* Right: Dual clocks */}
      <div className="flex items-center gap-6">
        {/* UTC Clock */}
        <Clock
          label="UTC"
          time={utcStr}
          date={utcDate}
          tz="UTC"
          accent="text-accent-cyan"
        />

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Local Clock */}
        <Clock
          label="LOCAL"
          time={localStr}
          date={localDate}
          tz={localTz}
          accent="text-accent-amber"
        />
      </div>
    </header>
  )
}

interface ClockProps {
  label: string
  time: string
  date: string
  tz: string
  accent: string
}

function Clock({ label, time, date, tz, accent }: ClockProps) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className={cn('section-label', accent)}>{label}</span>
        <span className="text-2xs text-text-muted">{tz}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn('font-display text-sm font-semibold tabular-nums', accent)}>
          {time}
        </span>
        <span className="font-data text-2xs text-text-muted tabular-nums">{date}</span>
      </div>
    </div>
  )
}
