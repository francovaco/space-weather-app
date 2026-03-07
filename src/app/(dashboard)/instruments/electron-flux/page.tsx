import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Electron Flux' }
// TODO: Plotly chart — >2 MeV and >4 MeV electron flux traces
// Time range: 6h | 1d | 3d | 7d · Refresh: 5 min · Usage + Impacts
export default function ElectronFluxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Electron Flux</h1>
        <p className="mt-1 text-xs text-text-muted">GOES-19 integral electron flux · &gt;2 MeV and &gt;4 MeV · Updates every 5 minutes</p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">Electron flux chart — to be implemented</div>
    </div>
  )
}
