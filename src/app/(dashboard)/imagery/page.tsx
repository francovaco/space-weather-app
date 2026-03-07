// ============================================================
// src/app/(dashboard)/imagery/page.tsx
// ============================================================
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'ABI Imagery' }

// TODO: Implement ABIImageryClient component that:
// - Band selector (16 bands with color-coded tabs)
// - Sector selector (Full Disk, CONUS, South America, Meso1, Meso2)
// - Full animation player:
//     - Canvas-based image loop renderer
//     - Play/Pause button
//     - Prev/Next frame buttons
//     - Frame count selector (12,24,36,48,60,72,84,96,120,150,180,240)
//     - Loop / Rock mode toggle
//     - Speed +/- controls
//     - Grid overlay toggle (lat/lon grid via Canvas 2D)
//     - Bottom slider for timeline scrubbing
//     - Auto-refresh every 10 min (adds new frame to queue)
//     - Download current frame button
//     - Download animated GIF button
//     - Resolution selector for download (339/678/1808/5424/10848 px)
// - Below player: channel documentation / band info card

export default function ImageryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          ABI Satellite Imagery
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          GOES-19 Advanced Baseline Imager · 16 channels · 10-minute imagery loop
        </p>
      </div>

      {/* TODO: <ABIImageryClient /> */}
      <div className="card text-center py-12 text-text-muted text-xs">
        ABI imagery player — to be implemented
      </div>
    </div>
  )
}
