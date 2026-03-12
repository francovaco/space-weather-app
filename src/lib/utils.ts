// ============================================================
// src/lib/utils.ts — Shared utility functions
// ============================================================
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatInTimeZone } from 'date-fns-tz'

/** Proxy an external image URL via our local API proxy */
export function proxyImg(url: string): string {
  if (!url) return ''
  return `/api/goes/img-proxy?url=${encodeURIComponent(url)}`
}

/** Merge Tailwind class names safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a Date as UTC string: "2024-11-15 14:32:00 UTC" */
export function formatUTC(date: Date, fmt = 'yyyy-MM-dd HH:mm:ss') {
  return formatInTimeZone(date, 'UTC', fmt) + ' UTC'
}

/** Format a Date in local timezone */
export function formatLocal(date: Date, timezone: string, fmt = 'yyyy-MM-dd HH:mm:ss zzz') {
  return formatInTimeZone(date, timezone, fmt)
}

/** Get user's IANA timezone string */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Format bytes to human readable */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/** Format a flux value in scientific notation */
export function formatFlux(value: number, decimals = 2): string {
  if (!value || isNaN(value)) return 'N/A'
  return value.toExponential(decimals)
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Zero-pad a number to given length */
export function zeroPad(n: number, length = 2): string {
  return String(n).padStart(length, '0')
}

/** Debounce function */
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), wait)
  }
}

/** Format milliseconds as mm:ss */
export function msToTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${zeroPad(m)}:${zeroPad(s % 60)}`
}

/** Get color class for X-ray flare class */
export function getFlareClassColor(cls: string): string {
  const map: Record<string, string> = {
    X: 'text-red-400',
    M: 'text-orange-400',
    C: 'text-yellow-400',
    B: 'text-green-400',
    A: 'text-blue-400',
  }
  return map[cls[0]] ?? 'text-slate-400'
}

/** Get NOAA Kp color */
export function getKpColor(kp: number): string {
  if (kp >= 9) return '#800000'
  if (kp >= 8) return '#ff0000'
  if (kp >= 7) return '#ff4500'
  if (kp >= 6) return '#ffa500'
  if (kp >= 5) return '#ffff00'
  if (kp >= 4) return '#00ff00'
  return '#22c55e'
}
