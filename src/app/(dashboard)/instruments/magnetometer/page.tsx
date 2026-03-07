import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Magnetómetro' }
export default function MagnetometerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Magnetómetro GOES
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Componentes del campo geomagnético · Hp, He, Hn · Actualización cada 1 minuto
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Gráfico del magnetómetro — a implementar
      </div>
    </div>
  )
}
