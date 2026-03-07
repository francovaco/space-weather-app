import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'WSA-ENLIL Solar Wind' }
// TODO: WSA-ENLIL model animation player · Play/Pause · Slider
// Refresh: 1 min · Usage + Impacts
export default function SolarWindPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">WSA-ENLIL Solar Wind Prediction</h1>
        <p className="mt-1 text-xs text-text-muted">Solar wind propagation model · CME arrival prediction · Updates every 1 minute</p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">WSA-ENLIL animation — to be implemented</div>
    </div>
  )
}
