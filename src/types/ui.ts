// ============================================================
// src/types/ui.ts — UI component types
// ============================================================

export interface NavItem {
  label: string
  href: string
  icon: string // Lucide icon name
  children?: NavItem[]
  badge?: string // e.g. "LIVE"
}

export interface UsageImpactContent {
  usage: string[]
  impacts: string[]
}

export type AlertLevel = 'none' | 'minor' | 'moderate' | 'strong' | 'severe' | 'extreme'

export interface SpaceWeatherAlert {
  level: AlertLevel
  message: string
  issued: Date
  expires?: Date
}

export interface ClockData {
  utc: Date
  local: Date
  localTimezone: string
  localOffset: string
}
