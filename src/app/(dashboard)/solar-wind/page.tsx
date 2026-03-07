import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Viento Solar WSA-ENLIL' }
export default function SolarWindPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Predicción de Viento Solar WSA-ENLIL
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Modelo de propagación del viento solar · Predicción de llegada de CMEs · Actualización cada 1 minuto
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Animación WSA-ENLIL — a implementar
      </div>
    </div>
  )
}
