'use client'
// ============================================================
// src/hooks/useClocks.ts — UTC and local time clocks
// Fix: initialize with null on server to avoid hydration mismatch
// ============================================================
import { useState, useEffect } from 'react'
import { getUserTimezone } from '@/lib/utils'
import type { ClockData } from '@/types/ui'

export function useClocks(tickIntervalMs = 1000): ClockData | null {
  // Start as null — renders nothing on server, avoids hydration mismatch
  const [clockData, setClockData] = useState<ClockData | null>(null)

  useEffect(() => {
    const tz = getUserTimezone()
    const tick = () => {
      const now = new Date()
      setClockData({
        utc: now,
        local: now,
        localTimezone: tz,
        localOffset: getUTCOffset(tz),
      })
    }
    tick()
    const id = setInterval(tick, tickIntervalMs)
    return () => clearInterval(id)
  }, [tickIntervalMs])

  return clockData
}

function getUTCOffset(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    const parts = formatter.formatToParts(new Date())
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC'
  } catch {
    return 'UTC'
  }
}
