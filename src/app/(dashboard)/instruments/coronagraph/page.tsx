import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Coronagraph' }
// TODO: Source selector (CCOR-1, CCOR-1 Diff, LASCO C2, LASCO C3)
// Animation player · Play/Pause · Slider · Refresh: 10 min · Usage + Impacts
export default function CoronagraphPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Coronagraph</h1>
        <p className="mt-1 text-xs text-text-muted">CME detection · GOES CCOR-1 · LASCO C2 &amp; C3 · Updates every 10 minutes</p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">Coronagraph animation player — to be implemented</div>
    </div>
  )
}
