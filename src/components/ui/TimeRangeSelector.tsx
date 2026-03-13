'use client'
// ============================================================
// src/components/ui/TimeRangeSelector.tsx
// Time range picker: 6h | 1d | 3d | 7d
// ============================================================
import { cn } from '@/lib/utils'
import type { TimeRange } from '@/types/swpc'
import { TIME_RANGE_OPTIONS } from '@/types/swpc'
import { useQueryString } from '@/hooks/useQueryString'
import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
  onDateChange?: (date: string) => void
  selectedDate?: string
  className?: string
  queryParamName?: string
}

export function TimeRangeSelector({ 
  value, 
  onChange, 
  onDateChange,
  selectedDate,
  className,
  queryParamName = 'range'
}: TimeRangeSelectorProps) {
  const { searchParams, createQueryString } = useQueryString()
  const [showDatePicker, setShowDatePicker] = useState(value === 'historical')
  
  // Sync from URL on mount
  useEffect(() => {
    const param = searchParams.get(queryParamName)
    if (param && param !== value) {
      if (TIME_RANGE_OPTIONS.some(o => o.value === param) || param === 'historical') {
        onChange(param as TimeRange)
        setShowDatePicker(param === 'historical')
      }
    }
    
    const dateParam = searchParams.get('date')
    if (dateParam && onDateChange) {
      onDateChange(dateParam)
    }
  }, [searchParams, queryParamName, value, onChange, onDateChange])

  const handleSelect = (newValue: TimeRange) => {
    if (newValue === value && newValue !== 'historical') return
    onChange(newValue)
    setShowDatePicker(newValue === 'historical')
    
    let url = `${window.location.pathname}?${createQueryString(queryParamName, newValue)}`
    if (newValue !== 'historical') {
      // Remove date param if not historical
      const params = new URLSearchParams(window.location.search)
      params.set(queryParamName, newValue)
      params.delete('date')
      url = `${window.location.pathname}?${params.toString()}`
    }
    window.history.replaceState({}, '', url)
  }

  const handleDateChange = (date: string) => {
    if (onDateChange) {
      onDateChange(date)
      const params = new URLSearchParams(window.location.search)
      params.set(queryParamName, 'historical')
      params.set('date', date)
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
    }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex gap-1 rounded-md border border-border bg-background-secondary p-0.5">
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
        
        <button
          onClick={() => handleSelect('historical')}
          className={cn(
            'rounded px-2.5 py-1 text-2xs font-medium transition-colors flex items-center gap-1.5',
            value === 'historical'
              ? 'bg-accent-amber text-white'
              : 'text-text-muted hover:text-text-primary'
          )}
          title="Consultar Histórico"
        >
          <Calendar size={12} />
          <span>Histórico</span>
        </button>
      </div>

      {showDatePicker && (
        <input 
          type="date"
          value={selectedDate || ''}
          onChange={(e) => handleDateChange(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="bg-background-secondary border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none focus:border-accent-amber transition-colors"
        />
      )}
    </div>
  )
}
