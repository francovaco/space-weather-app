'use client'
// ============================================================
// src/components/instruments/SolarSynopticClient.tsx
// Solar Synoptic Map image with auto-refresh and Usage/Impacts
// ============================================================
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getSolarSynopticMap } from '@/lib/swpc-api'

interface SynopticData {
  url: string
  updated: string
}

const USAGE = [
  'Instantánea diaria de las condiciones en la superficie solar dibujada por los pronosticadores del SWPC',
  'Identificación y seguimiento de regiones activas, agujeros coronales y filamentos',
  'Delimitación de líneas neutras (fronteras entre polaridades magnéticas)',
  'Mapeo de plages (regiones brillantes asociadas a campos magnéticos intensos)',
  'Evaluación visual de la distribución de actividad sobre el disco solar',
  'Herramienta clave para la elaboración del pronóstico de clima espacial',
  'Registro histórico diario de la actividad solar para análisis de tendencias',
]

const IMPACTS = [
  'Regiones activas complejas pueden producir erupciones solares de clase M o X',
  'Agujeros coronales orientados hacia la Tierra generan flujos de viento solar rápido',
  'Filamentos en erupción pueden lanzar eyecciones de masa coronal (CME)',
  'Configuraciones magnéticas complejas aumentan la probabilidad de actividad geomagnética',
  'El viento solar rápido de agujeros coronales puede provocar tormentas geomagnéticas recurrentes',
  'Cambios en la actividad solar afectan las condiciones de propagación HF a nivel global',
  'La posición de regiones activas determina la probabilidad de impacto geo-efectivo',
]

export function SolarSynopticClient() {
  const { data, isLoading, isError } = useAutoRefresh<SynopticData>({
    queryKey: ['solar-synoptic'],
    fetcher: () => getSolarSynopticMap() as Promise<SynopticData>,
    intervalMs: REFRESH_INTERVALS.TEN_MIN,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Mapa Solar Sinóptico
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          SWPC · Mapa diario de la superficie solar con regiones activas, agujeros coronales y filamentos
        </p>
      </div>

      {/* Image */}
      <div className="card relative overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
              Cargando mapa sinóptico…
            </div>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center py-24">
            <span className="text-xs text-red-400">Error al cargar el mapa sinóptico</span>
          </div>
        )}
        {data && (
          <div className="flex flex-col items-center">
            <img
              src={`${data.url}?t=${new Date(data.updated).getTime()}`}
              alt="Mapa Solar Sinóptico SWPC"
              className="w-full max-w-[900px] rounded"
              loading="lazy"
            />
            <p className="mt-2 pb-2 text-[10px] text-text-dim">
              Actualizado: {new Date(data.updated).toLocaleString('es-AR', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} UTC
            </p>
          </div>
        )}
      </div>

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      {/* Detalles */}
      <SectionDetails>
        <p>
          El Mapa Sinóptico Solar es un dibujo manual elaborado diariamente por los pronosticadores del SWPC de la NOAA, que resume las principales estructuras y fenómenos observados en el disco solar visible. Es una herramienta de referencia fundamental utilizada en los briefings operacionales de clima espacial.
        </p>
        <p>
          El mapa identifica y etiqueta: regiones activas (con su número NOAA), agujeros coronales (regiones oscuras de campo magnético abierto que emiten viento solar rápido), filamentos y prominencias (estructuras de plasma frío suspendidas en la corona), líneas neutras de polaridad magnética, y plages (regiones cromosféricas brillantes asociadas a campos magnéticos intensos).
        </p>
        <p>
          Los pronosticadores utilizan datos de múltiples fuentes para crear el mapa: imágenes del SDO (AIA/HMI), imágenes H-alpha de la red GONG, magnetogramas, e imágenes coronales de SUVI. La posición de cada estructura se registra en coordenadas heliográficas, permitiendo el seguimiento de la rotación solar día a día.
        </p>
      </SectionDetails>
    </div>
  )
}
