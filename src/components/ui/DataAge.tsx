'use client'
// ============================================================
// src/components/ui/DataAge.tsx
// Displays "X minutes ago" based on a timestamp
// ============================================================
import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataAgeProps {
  timestamp?: string | null
  className?: string
}

export function DataAge({ timestamp, className }: DataAgeProps) {
  const [ageText, setAgeText] = useState<string>('---')
  const [statusColor, setStatusColor] = useState<string>('text-text-muted')

  useEffect(() => {
    if (!timestamp) {
      setAgeText('Sin datos')
      setStatusColor('text-text-muted')
      return
    }

    const updateAge = () => {
      const dataTime = new Date(timestamp).getTime()
      const now = new Date().getTime()
      const diffMs = now - dataTime
      const diffMin = Math.floor(diffMs / 60000)

      if (isNaN(dataTime)) {
        setAgeText('Error fecha')
        return
      }

      if (diffMin < 0) {
        setAgeText('Reciente')
        setStatusColor('text-accent-cyan')
      } else if (diffMin < 2) {
        setAgeText('En vivo')
        setStatusColor('text-green-500')
      } else if (diffMin < 10) {
        setAgeText(`Hace ${diffMin} min`)
        setStatusColor('text-green-400')
      } else if (diffMin < 30) {
        setAgeText(`Hace ${diffMin} min`)
        setStatusColor('text-amber-400')
      } else if (diffMin < 1440) {
        const hours = Math.floor(diffMin / 60)
        setAgeText(`Hace ${hours}h ${diffMin % 60}m`)
        setStatusColor('text-orange-500')
      } else {
        setAgeText('Dato antiguo')
        setStatusColor('text-red-500')
      }
    }

    updateAge()
    const interval = setInterval(updateAge, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [timestamp])

  return (
    <div className={cn("flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-tighter", statusColor, className)}>
      <Clock size={10} className="animate-pulse" />
      <span>{ageText}</span>
    </div>
  )
}
