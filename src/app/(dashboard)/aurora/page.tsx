import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Pronóstico de Aurora' }
export default function AuroraPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Pronóstico de Aurora — 30 Minutos
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Probabilidad de aurora en polos Norte y Sur · Actualización cada 5 minutos
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Animaciones de pronóstico de aurora — a implementar
      </div>
    </div>
  )
}
