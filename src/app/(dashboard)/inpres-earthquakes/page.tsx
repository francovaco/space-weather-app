import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

export const metadata: Metadata = { title: 'Sismos INPRES' }

const InpresEarthquakesClient = dynamic(
  () => import('@/components/inpres/InpresEarthquakesClient').then(m => m.InpresEarthquakesClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-text-muted">
        Cargando mapa…
      </div>
    ),
  },
)

export default function InpresEarthquakesPage() {
  return (
    <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 10rem)' }}>
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Sismos INPRES
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Instituto Nacional de Prevención Sísmica · Últimos 30 eventos · Actualización cada 5 min
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <InpresEarthquakesClient />
      </div>
    </div>
  )
}
