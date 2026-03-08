'use client'
// ============================================================
// src/app/(dashboard)/noaa-scales/NoaaScalesClient.tsx
// NOAA Space Weather Scales explained in Spanish
// Based on https://www.swpc.noaa.gov/noaa-scales-explanation
// ============================================================
import { cn } from '@/lib/utils'

// ── Scale data ──

interface ScaleLevel {
  level: string
  label: string
  effect: string
  frequency: string
}

const R_SCALES: ScaleLevel[] = [
  {
    level: 'R5',
    label: 'Extrema',
    effect: 'Apagón total de HF en el lado iluminado de la Tierra durante horas. Navegación por baja frecuencia degradada durante horas.',
    frequency: 'Menos de 1 por ciclo solar (11 años)',
  },
  {
    level: 'R4',
    label: 'Severa',
    effect: 'Apagones HF en la mayor parte del lado iluminado durante 1-2 horas. Pérdida de contacto por radio HF durante ese período.',
    frequency: '8 por ciclo solar (925 días)',
  },
  {
    level: 'R3',
    label: 'Fuerte',
    effect: 'Apagones HF extendidos en el lado iluminado. Pérdida de contacto por radio durante aproximadamente una hora. Degradación de navegación por baja frecuencia.',
    frequency: '175 por ciclo solar (140 días)',
  },
  {
    level: 'R2',
    label: 'Moderada',
    effect: 'Apagones HF limitados en el lado iluminado. Pérdida de contacto por radio durante decenas de minutos.',
    frequency: '350 por ciclo solar (75 días)',
  },
  {
    level: 'R1',
    label: 'Menor',
    effect: 'Degradaciones menores de comunicaciones HF en el lado iluminado. Pérdidas ocasionales de contacto por radio.',
    frequency: '2000 por ciclo solar (950 días)',
  },
]

const S_SCALES: ScaleLevel[] = [
  {
    level: 'S5',
    label: 'Extrema',
    effect: 'Exposición de radiación muy alta para astronautas en EVA. Satélites pueden quedar inutilizables. HF completamente degradado en regiones polares.',
    frequency: 'Menos de 1 por ciclo solar',
  },
  {
    level: 'S4',
    label: 'Severa',
    effect: 'Riesgo de radiación elevado para astronautas en EVA. Problemas significativos en satélites con pérdida de tracking. HF en zonas polares degradado durante días.',
    frequency: '3 por ciclo solar',
  },
  {
    level: 'S3',
    label: 'Fuerte',
    effect: 'Dosis de radiación elevada para pasajeros de aviación en rutas polares. Eventos de carga en satélites y errores en electrónica. HF degradado en regiones polares.',
    frequency: '10 por ciclo solar',
  },
  {
    level: 'S2',
    label: 'Moderada',
    effect: 'Efectos menores en sistemas de satélites. Pequeños efectos en propagación HF en regiones polares. Dosis de radiación ligeramente elevada para aviación polar.',
    frequency: '25 por ciclo solar',
  },
  {
    level: 'S1',
    label: 'Menor',
    effect: 'Impacto menor en operaciones de satélites. Efectos menores en propagación HF en los polos.',
    frequency: '50 por ciclo solar',
  },
]

const G_SCALES: ScaleLevel[] = [
  {
    level: 'G5',
    label: 'Extrema',
    effect: 'Problemas generalizados de control de voltaje y colapso potencial de redes eléctricas. Daños a transformadores. Auroras visibles hasta latitud 40°.',
    frequency: '4 por ciclo solar (4 días)',
  },
  {
    level: 'G4',
    label: 'Severa',
    effect: 'Problemas generalizados de control de voltaje. Algunos sistemas de protección pueden desconectarse erróneamente. Auroras visibles hasta latitud 45°.',
    frequency: '100 por ciclo solar (60 días)',
  },
  {
    level: 'G3',
    label: 'Fuerte',
    effect: 'Correcciones de voltaje necesarias. Falsas alarmas en algunos dispositivos de protección. Auroras visibles hasta latitud 50°.',
    frequency: '200 por ciclo solar (130 días)',
  },
  {
    level: 'G2',
    label: 'Moderada',
    effect: 'Posibles alertas de voltaje en sistemas eléctricos de alta latitud. Corrección en órbita de satélites puede ser necesaria. Auroras visibles hasta latitud 55°.',
    frequency: '600 por ciclo solar (360 días)',
  },
  {
    level: 'G1',
    label: 'Menor',
    effect: 'Fluctuaciones débiles en redes eléctricas. Impacto menor en operaciones de satélites. Auroras visibles hasta latitud 60°.',
    frequency: '1700 por ciclo solar (900 días)',
  },
]

const SCALE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '5': { bg: 'bg-red-600/20', text: 'text-red-500', border: 'border-red-600/30' },
  '4': { bg: 'bg-accent-red/20', text: 'text-accent-red', border: 'border-accent-red/30' },
  '3': { bg: 'bg-accent-orange/20', text: 'text-accent-orange', border: 'border-accent-orange/30' },
  '2': { bg: 'bg-accent-amber/20', text: 'text-accent-amber', border: 'border-accent-amber/30' },
  '1': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
}

function levelColor(level: string) {
  const n = level.slice(1)
  return SCALE_COLORS[n] ?? SCALE_COLORS['1']
}

// ── Component ──

export function NoaaScalesClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Escalas NOAA de Clima Espacial
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Clasificación oficial de eventos de clima espacial según la NOAA/SWPC
        </p>
      </div>

      {/* Introduction */}
      <div className="card p-4">
        <p className="text-xs text-text-secondary leading-relaxed">
          Las Escalas de Clima Espacial de la NOAA fueron introducidas como medio para comunicar al público general
          la gravedad e impacto de los eventos de clima espacial. Las escalas describen las perturbaciones ambientales
          según tres categorías: <strong className="text-accent-cyan">Tormentas Geomagnéticas (G)</strong>,{' '}
          <strong className="text-accent-cyan">Tormentas de Radiación Solar (S)</strong>, y{' '}
          <strong className="text-accent-cyan">Apagones de Radio (R)</strong>.
          Cada categoría tiene niveles del 1 (menor) al 5 (extremo), similares a las escalas de huracanes o tornados.
        </p>
      </div>

      {/* R Scale */}
      <ScaleSection
        type="R"
        title="Apagones de Radio"
        description="Los apagones de radio se producen cuando una perturbación solar ioniza inesperadamente la capa D de la ionósfera. Las comunicaciones de alta frecuencia (HF) y la navegación de baja frecuencia se degradan o pierden."
        indicator="Flujo de Rayos X GOES (clase M y X)"
        scales={R_SCALES}
      />

      {/* S Scale */}
      <ScaleSection
        type="S"
        title="Tormentas de Radiación Solar"
        description="Las tormentas de radiación solar ocurren cuando partículas energéticas (mayormente protones) son aceleradas por erupciones solares o eyecciones de masa coronal. Estas partículas pueden penetrar la magnetósfera y afectar satélites, astronautas y comunicaciones polares."
        indicator="Flujo de protones ≥ 10 MeV (GOES)"
        scales={S_SCALES}
      />

      {/* G Scale */}
      <ScaleSection
        type="G"
        title="Tormentas Geomagnéticas"
        description="Las tormentas geomagnéticas son perturbaciones del campo magnético terrestre causadas por la interacción del viento solar y las eyecciones de masa coronal con la magnetósfera. Afectan redes eléctricas, satélites, navegación y producen auroras."
        indicator="Índice planetario Kp"
        scales={G_SCALES}
      />

      {/* Source attribution */}
      <div className="card p-4 text-center">
        <p className="text-2xs text-text-dim">
          Información basada en las escalas oficiales del{' '}
          <a
            href="https://www.swpc.noaa.gov/noaa-scales-explanation"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-cyan hover:underline"
          >
            Space Weather Prediction Center (SWPC) de la NOAA
          </a>
          . Traducción y adaptación al español.
        </p>
      </div>
    </div>
  )
}

function ScaleSection({
  type,
  title,
  description,
  indicator,
  scales,
}: {
  type: string
  title: string
  description: string
  indicator: string
  scales: ScaleLevel[]
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border p-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-text-primary">
          {title} ({type})
        </h2>
        <p className="mt-1 text-xs text-text-secondary leading-relaxed">{description}</p>
        <p className="mt-1.5 text-2xs text-text-dim">
          <span className="font-semibold text-text-muted">Indicador físico:</span> {indicator}
        </p>
      </div>

      <div className="divide-y divide-border/50">
        {scales.map((s) => {
          const c = levelColor(s.level)
          return (
            <div key={s.level} className="flex gap-3 px-4 py-3">
              <div className="shrink-0 pt-0.5">
                <span className={cn('inline-flex items-center justify-center rounded px-2 py-1 text-xs font-bold min-w-[2.5rem]', c.bg, c.text, `border ${c.border}`)}>
                  {s.level}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn('text-xs font-semibold', c.text)}>{s.label}</span>
                <p className="mt-0.5 text-2xs text-text-secondary leading-relaxed">{s.effect}</p>
                <p className="mt-0.5 text-2xs text-text-dim">Frecuencia promedio: {s.frequency}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
