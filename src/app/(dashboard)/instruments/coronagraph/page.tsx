import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Coronógrafo' }
export default function CoronagraphPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Coronógrafo
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Detección de CMEs · GOES CCOR-1 · LASCO C2 y C3 · Actualización cada 10 minutos
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Reproductor de animaciones del coronógrafo — a implementar
      </div>
    </div>
  )
}
