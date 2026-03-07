import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Mapa Solar Sinóptico' }
export default function SolarSynopticPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Mapa Solar Sinóptico
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Mapa completo del campo magnético solar y actividad
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Mapa solar sinóptico — a implementar
      </div>
    </div>
  )
}
