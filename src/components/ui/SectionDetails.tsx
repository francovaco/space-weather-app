// ============================================================
// src/components/ui/SectionDetails.tsx
// "Detalles" panel for instrument/section pages
// ============================================================
import { cn } from '@/lib/utils'

interface SectionDetailsProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function SectionDetails({
  title = 'Detalles',
  children,
  className,
}: SectionDetailsProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-background-secondary', className)}>
      <div className="px-4 py-2.5">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-text-secondary">
          {title}
        </span>
      </div>
      <div className="border-t border-border px-4 py-3 text-2xs leading-relaxed text-text-secondary space-y-3">
        {children}
      </div>
    </div>
  )
}
