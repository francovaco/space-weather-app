import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'SUVI Ultravioleta Solar' }
export default function SUVIPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          SUVI — Generador de Imágenes Ultravioleta Solar
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Imágenes de la corona solar · 5 longitudes de onda · Actualización cada 5 minutos
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Reproductor de animaciones SUVI — a implementar
      </div>
    </div>
  )
}
