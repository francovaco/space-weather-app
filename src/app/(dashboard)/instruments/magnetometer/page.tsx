// ============================================================
// src/app/(dashboard)/instruments/magnetometer/page.tsx
// ============================================================
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Magnetometer' }

// TODO: Implement MagnetometerClient that:
// - Fetches /api/swpc/magnetometer?range=1-day (default)
// - Renders interactive Plotly chart (Hp, He, Hn, Total field traces)
// - Time range selector: 6h | 1d | 3d | 7d
// - Mouse hover shows values crosshair
// - Auto-refresh every 1 minute
// - Usage and Impacts sections below

export default function MagnetometerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          GOES Magnetometer
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Geomagnetic field components · Hp, He, Hn · Updates every 1 minute
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Magnetometer chart — to be implemented
      </div>
    </div>
  )
}
