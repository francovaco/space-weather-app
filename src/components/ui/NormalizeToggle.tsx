import { cn } from '@/lib/utils'

interface NormalizeToggleProps {
  normalize: boolean
  onToggle: (value: boolean) => void
  className?: string
}

export function NormalizeToggle({ normalize, onToggle, className }: NormalizeToggleProps) {
  return (
    <div className={cn("flex items-center gap-3 bg-background-secondary border border-border pl-3 pr-2 py-1 rounded-lg shadow-sm shrink-0", className)}>
      <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-text-dim leading-none">Normalizar</span>
      <button
        onClick={() => onToggle(!normalize)}
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
          normalize ? "bg-primary shadow-glow-blue" : "bg-slate-700"
        )}
      >
        <span className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 shadow-md",
          normalize ? "translate-x-5" : "translate-x-0.5"
        )} />
      </button>
    </div>
  )
}

/** Robust normalization helper for numeric arrays */
export function normalizeSeries(values: (number | null | undefined)[]): number[] {
  if (!values || values.length === 0) return []
  
  // Convert nulls/undefined to NaN for consistent processing
  const numericValues = values.map(v => (v === null || v === undefined) ? NaN : v)
  const clean = numericValues.filter(v => !isNaN(v) && isFinite(v))
  
  if (clean.length === 0) return new Array(values.length).fill(0)
  
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  
  if (max === min) return numericValues.map(v => isNaN(v) ? 0 : 50) 
  
  return numericValues.map(v => {
    if (isNaN(v) || !isFinite(v)) return 0
    return ((v - min) / (max - min)) * 100
  })
}
