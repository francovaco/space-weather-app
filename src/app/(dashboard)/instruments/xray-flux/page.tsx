import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Flujo de Rayos X' }
export default function XRayFluxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Flujo de Rayos X Solar
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          GOES-19 · Onda corta y onda larga · Actualización cada 1 minuto
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Gráfico de flujo de rayos X — a implementar
      </div>
    </div>
  )
}
