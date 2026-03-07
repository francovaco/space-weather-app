import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Flujo de Electrones' }
export default function ElectronFluxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Flujo de Electrones
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          GOES-19 · Flujo integral de electrones &gt;2 MeV y &gt;4 MeV · Actualización cada 5 minutos
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Gráfico de flujo de electrones — a implementar
      </div>
    </div>
  )
}
