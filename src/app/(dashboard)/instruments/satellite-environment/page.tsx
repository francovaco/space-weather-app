import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Satellite Environment' }
// TODO: Combined view of Proton + Electron + X-Ray flux on same panel
// Interactive hover · No time range selector · No Usage/Impacts
export default function SatelliteEnvironmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Satellite Environment</h1>
        <p className="mt-1 text-xs text-text-muted">Combined particle and X-ray environment · Real-time overview</p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">Satellite environment panel — to be implemented</div>
    </div>
  )
}
