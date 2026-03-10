'use client'
// ============================================================
// src/components/layout/TopBar.tsx
// ============================================================
import { useClocks } from '@/hooks/useClocks'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { Menu, Satellite } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { SpaceWeatherPills } from '@/components/layout/SpaceWeatherBar'
import { WeatherPill } from '@/components/layout/WeatherPill'
import Link from 'next/link'

export function TopBar() {
  const clocks = useClocks()
  const { toggleSidebar } = useUIStore()

  // clocks is null on first server render — show placeholder to avoid hydration mismatch
  const utcStr   = clocks ? formatInTimeZone(clocks.utc,   'UTC', 'HH:mm:ss')       : '──:──:──'
  const utcDate  = clocks ? formatInTimeZone(clocks.utc,   'UTC', 'yyyy-MM-dd')      : '────-──-──'
  const localStr = clocks ? formatInTimeZone(clocks.local, clocks.localTimezone, 'HH:mm:ss')  : '──:──:──'
  const localDate= clocks ? formatInTimeZone(clocks.local, clocks.localTimezone, 'yyyy-MM-dd') : '────-──-──'
  const localTz  = clocks?.localOffset ?? '───'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background-secondary px-4">
      {/* Left */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="ctrl-btn" aria-label="Alternar barra lateral">
            <Menu size={16} />
          </button>
          <Link href="/" prefetch={false} className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <Satellite size={14} className="text-accent-cyan" />
            <span className="font-display text-xs font-semibold tracking-widest text-text-primary uppercase">
              GOES-19
            </span>
          </Link>
        </div>

        {/* Local weather from SMN */}
        <Link href="/" prefetch={false} className="hover:opacity-80 transition-opacity">
          <WeatherPill />
        </Link>
      </div>

      {/* Center: space weather conditions pills */}
      <SpaceWeatherPills />

      {/* Right: dual clocks — suppressHydrationWarning prevents React complaining
          about the ── placeholder vs real time on first paint */}
      <div className="flex items-center gap-6" suppressHydrationWarning>
        <Clock label="UTC"   time={utcStr}   date={utcDate}   tz="UTC"   accent="text-accent-cyan" />
        <div className="h-6 w-px bg-border" />
        <Clock label="LOCAL" time={localStr} date={localDate} tz={localTz} accent="text-accent-amber" />
      </div>
    </header>
  )
}

interface ClockProps { label: string; time: string; date: string; tz: string; accent: string }

function Clock({ label, time, date, tz, accent }: ClockProps) {
  return (
    <div className="flex flex-col items-end gap-0.5" style={{ width: '12rem' }}>
      <div className="flex w-full items-center justify-end gap-1.5">
        <span className={cn('section-label', accent)}>{label}</span>
        <span className="font-data text-2xs text-text-muted" style={{ minWidth: '5rem', textAlign: 'right' }}>
          {tz}
        </span>
      </div>
      <div className="flex w-full items-baseline justify-end gap-1.5" suppressHydrationWarning>
        <span className={cn('font-display text-sm font-semibold tabular-nums', accent)}
              style={{ width: '5.6rem', textAlign: 'right' }} suppressHydrationWarning>
          {time}
        </span>
        <span className="font-data text-2xs text-text-muted tabular-nums"
              style={{ width: '5.4rem', textAlign: 'right' }} suppressHydrationWarning>
          {date}
        </span>
      </div>
    </div>
  )
}
