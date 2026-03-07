// ============================================================
// src/app/(dashboard)/satellite-status/page.tsx
// ============================================================
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Satellite Status' }

// TODO: Implement SatelliteStatusClient component that:
// - Fetches from /api/goes/status (which proxies https://www.ospo.noaa.gov/operations/goes/status.html)
// - Parses instrument status table
// - Shows each instrument with operational status badge
// - Auto-refreshes every 5 minutes
// - Shows last updated timestamp

export default function SatelliteStatusPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Satellite &amp; Instrument Status
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          GOES-19 operational status · Source: NOAA OSPO · Updates every 5 minutes
        </p>
      </div>

      {/* TODO: <SatelliteStatusClient /> */}
      <div className="card text-center py-12 text-text-muted text-xs">
        Satellite status panel — to be implemented
      </div>
    </div>
  )
}
