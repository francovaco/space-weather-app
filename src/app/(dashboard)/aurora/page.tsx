import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Aurora Forecast' }
// TODO: Side-by-side north and south pole aurora animation players
// Each with Play/Pause + timeline slider · Refresh: 5 min
// Shared Usage + Impacts section below
export default function AuroraPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Aurora 30-Minute Forecast</h1>
        <p className="mt-1 text-xs text-text-muted">North and South pole aurora probability · Updates every 5 minutes</p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">Aurora forecast animations — to be implemented</div>
    </div>
  )
}
