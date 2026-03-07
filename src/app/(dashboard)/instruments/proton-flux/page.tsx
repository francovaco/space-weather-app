import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Proton Flux' }
// TODO: Plotly chart — >10, >50, >100, >500 MeV proton flux traces
// Time range: 6h | 1d | 3d | 7d · Refresh: 5 min · Usage + Impacts
export default function ProtonFluxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Proton Flux</h1>
        <p className="mt-1 text-xs text-text-muted">GOES-19 integral proton flux · Multiple energy levels · Updates every 5 minutes</p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">Proton flux chart — to be implemented</div>
    </div>
  )
}
