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

      {/* Right: Dual clocks — fixed-width containers prevent layout shift */}
      <div className="flex items-center gap-6">
        <Clock
          label="UTC"
          time={utcStr}
          date={utcDate}
          tz="UTC"
          accent="text-accent-cyan"
        />
        <div className="h-6 w-px bg-border" />
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
    // Fixed outer width — the whole clock never resizes
    <div className="flex flex-col items-end gap-0.5" style={{ width: '12rem' }}>

      {/* Label row — fixed widths on each token */}
      <div className="flex w-full items-center justify-end gap-1.5">
        <span className={cn('section-label', accent)}>{label}</span>
        {/* Timezone label: wide enough for "UTC+XX:XX", right-aligned, never shifts */}
        <span
          className="font-data text-2xs text-text-muted"
          style={{ minWidth: '5rem', textAlign: 'right' }}
        >
          {tz}
        </span>
      </div>

      {/* Time row — ch units lock each piece to its character count */}
      <div className="flex w-full items-baseline justify-end gap-1.5">
        {/* HH:mm:ss = 8 chars in a monospace display font */}
        <span
          className={cn('font-display text-sm font-semibold tabular-nums', accent)}
          style={{ width: '5.6rem', textAlign: 'right' }}
        >
          {time}
        </span>
        {/* yyyy-MM-dd = 10 chars */}
        <span
          className="font-data text-2xs text-text-muted tabular-nums"
          style={{ width: '5.4rem', textAlign: 'right' }}
        >
          {date}
        </span>
      </div>
    </div>
  )
}
