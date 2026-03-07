import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'SUVI Solar UV' }
// TODO: Wavelength tab selector (94, 131, 171, 195, 284 Å)
// Animation player for selected wavelength · Play/Pause · Slider
// Refresh: 5 min · Usage + Impacts
export default function SUVIPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">SUVI Solar Ultraviolet Imager</h1>
        <p className="mt-1 text-xs text-text-muted">Solar corona imaging · 5 wavelengths · Updates every 5 minutes</p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">SUVI animation player — to be implemented</div>
    </div>
  )
}
