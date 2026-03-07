'use client'
// ============================================================
// src/components/ui/TimeRangeSelector.tsx
// Time range picker: 6h | 1d | 3d | 7d
// ============================================================
import { cn } from '@/lib/utils'
import type { TimeRange } from '@/types/swpc'
import { TIME_RANGE_OPTIONS } from '@/types/swpc'

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
  className?: string
}

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  return (
    <div className={cn('flex gap-1 rounded-md border border-border bg-background-secondary p-0.5', className)}>
      {TIME_RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded px-2.5 py-1 text-2xs font-medium transition-colors',
            value === opt.value
              ? 'bg-primary text-white'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
