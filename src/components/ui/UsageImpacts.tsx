'use client'
// ============================================================
// src/components/ui/UsageImpacts.tsx
// Reusable Usage + Impacts info blocks shown below instruments
// ============================================================
import { cn } from '@/lib/utils'

interface UsageImpactsProps {
  usage: string[]
  impacts: string[]
  className?: string
}

export function UsageImpacts({ usage, impacts, className }: UsageImpactsProps) {
  return (
    <div className={cn('grid gap-3 md:grid-cols-2', className)}>
      <div className="info-block">
        <p className="info-block-title">Usage</p>
        <ul className="info-block-list space-y-1.5">
          {usage.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5 text-2xs text-text-secondary">
              <span className="mt-0.5 text-accent-cyan">›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="info-block">
        <p className="info-block-title" style={{ color: '#f59e0b' }}>Impacts</p>
        <ul className="info-block-list space-y-1.5">
          {impacts.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5 text-2xs text-text-secondary">
              <span className="mt-0.5 text-accent-amber">›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
