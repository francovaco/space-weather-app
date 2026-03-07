import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'X-Ray Flux' }
// TODO: Plotly chart — short (0.05–0.4 nm) and long (0.1–0.8 nm) X-ray traces
// Flare class annotation lines (A/B/C/M/X thresholds)
// Time range: 6h | 1d | 3d | 7d · Refresh: 1 min · Usage + Impacts
export default function XRayFluxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">X-Ray Flux</h1>
        <p className="mt-1 text-xs text-text-muted">GOES-19 solar X-ray flux · Short &amp; long wave · Updates every 1 minute</p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">X-ray flux chart — to be implemented</div>
    </div>
  )
}
