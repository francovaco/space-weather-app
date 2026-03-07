import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Imágenes ABI' }
export default function ImageryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Imágenes Satelitales ABI
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          GOES-19 Generador de Imágenes de Línea de Base Avanzado · 16 canales · Loop de imágenes cada 10 minutos
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Reproductor de imágenes ABI — a implementar
      </div>
    </div>
  )
}
