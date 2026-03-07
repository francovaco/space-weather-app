import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Flujo de Protones' }
export default function ProtonFluxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Flujo de Protones
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          GOES-19 · Flujo integral de protones en múltiples niveles de energía · Actualización cada 5 minutos
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Gráfico de flujo de protones — a implementar
      </div>
    </div>
  )
}
