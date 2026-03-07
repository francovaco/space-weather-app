'use client'
// ============================================================
// src/hooks/useClocks.ts — UTC and local time clocks
// ============================================================
import { useState, useEffect } from 'react'
import { getUserTimezone, formatUTC, formatLocal } from '@/lib/utils'
import type { ClockData } from '@/types/ui'

export function useClocks(tickIntervalMs = 1000): ClockData {
  const [clockData, setClockData] = useState<ClockData>(() => {
    const now = new Date()
    const tz = getUserTimezone()
    return {
      utc: now,
      local: now,
      localTimezone: tz,
      localOffset: getUTCOffset(tz),
    }
  })

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
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    const parts = formatter.formatToParts(now)
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC'
  } catch {
    return 'UTC'
  }
}
