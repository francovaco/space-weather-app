'use client'
// ============================================================
// src/components/ui/TimeRangeSelector.tsx
// Time range picker: 6h | 1d | 3d | 7d
// ============================================================
import { cn } from '@/lib/utils'
import type { TimeRange } from '@/types/swpc'
import { TIME_RANGE_OPTIONS } from '@/types/swpc'
import { useQueryString } from '@/hooks/useQueryString'
import { useEffect } from 'react'

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
  className?: string
  queryParamName?: string
}

export function TimeRangeSelector({ 
  value, 
  onChange, 
  className,
  queryParamName = 'range'
}: TimeRangeSelectorProps) {
  const { searchParams, createQueryString } = useQueryString()
  
  // Sync from URL on mount
  useEffect(() => {
    const param = searchParams.get(queryParamName)
    // Check if valid TimeRange
    if (param && param !== value && TIME_RANGE_OPTIONS.some(o => o.value === param)) {
      onChange(param as TimeRange)
    }
  }, [searchParams, queryParamName, value, onChange])

  const handleSelect = (newValue: TimeRange) => {
    if (newValue === value) return
    onChange(newValue)
    // Update URL via window history directly to avoid full page reloads/jank
    // using the hook's helper logic would also work but this is cleaner for pure UI component
    const url = `${window.location.pathname}?${createQueryString(queryParamName, newValue)}`
    window.history.replaceState({}, '', url)
  }

  return (
    <div className={cn('flex gap-1 rounded-md border border-border bg-background-secondary p-0.5', className)}>
      {TIME_RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleSelect(opt.value)}
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
