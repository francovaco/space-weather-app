'use client'
// ============================================================
// src/hooks/useAutoRefresh.ts — Polling hook for live data
// ============================================================
import { useQuery } from '@tanstack/react-query'

interface UseAutoRefreshOptions {
  queryKey: readonly unknown[]
  fetcher: () => Promise<unknown>
  /** Refresh interval in milliseconds */
  intervalMs: number
  enabled?: boolean
}

export function useAutoRefresh<T>({
  queryKey,
  fetcher,
  intervalMs,
  enabled = true,
}: UseAutoRefreshOptions) {
  return useQuery<T>({
    queryKey,
    queryFn: fetcher as () => Promise<T>,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: true,
    staleTime: intervalMs * 0.9,
    enabled,
  })
}

/** 
 * Common refresh intervals matching SWPC/NOAA update schedules
 */
export const REFRESH_INTERVALS = {
  /** 1 minute — magnetometer, x-ray flux, solar wind, particles, aurora */
  ONE_MIN: 60_000,
  /** 5 minutes — generic fallback */
  FIVE_MIN: 5 * 60_000,
  /** 10 minutes — model outputs */
  TEN_MIN: 10 * 60_000,
  /** 30 minutes — Kp index (published every 3h) */
  THIRTY_MIN: 30 * 60_000,
  /** Satellite status — every 5 min */
  STATUS: 5 * 60_000,
} as const
