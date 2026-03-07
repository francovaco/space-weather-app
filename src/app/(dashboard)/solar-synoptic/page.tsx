import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Solar Synoptic Map' }
// TODO: Static/updated solar synoptic map image · Usage + Impacts
export default function SolarSynopticPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Solar Synoptic Map</h1>
        <p className="mt-1 text-xs text-text-muted">Full-sun magnetic field and activity map</p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">Solar synoptic map — to be implemented</div>
    </div>
  )
}
