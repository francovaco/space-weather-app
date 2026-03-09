// ============================================================
// src/components/space-weather/SpaceWeatherIndex.tsx
// Card grid index for Impacts + Phenomena
// ============================================================
import Link from 'next/link'
import { IMPACTS, PHENOMENA } from '@/lib/space-weather-content'
import {
  Zap, Navigation, Radio, Satellite, Orbit,
  Sun, Wind, Globe, Waves, Atom, Activity,
  CloudLightning, Shield, CircleDot, Flame, BarChart3,
} from 'lucide-react'

const IMPACT_ICONS: Record<string, React.ReactNode> = {
  'electric-power': <Zap size={18} />,
  gps: <Navigation size={18} />,
  'hf-radio': <Radio size={18} />,
  'satellite-communications': <Satellite size={18} />,
  'satellite-drag': <Orbit size={18} />,
}

const PHENOMENON_ICONS: Record<string, React.ReactNode> = {
  aurora: <Waves size={18} />,
  'coronal-holes': <CircleDot size={18} />,
  'coronal-mass-ejections': <Flame size={18} />,
  'earths-magnetosphere': <Shield size={18} />,
  'f107-radio-emissions': <Radio size={18} />,
  'galactic-cosmic-rays': <Atom size={18} />,
  'geomagnetic-storms': <CloudLightning size={18} />,
  ionosphere: <Globe size={18} />,
  'ionospheric-scintillation': <Activity size={18} />,
  'radiation-belts': <CircleDot size={18} />,
  'solar-euv-irradiance': <Sun size={18} />,
  'solar-flares': <Zap size={18} />,
  'solar-radiation-storm': <Atom size={18} />,
  'solar-wind': <Wind size={18} />,
  'sunspots-solar-cycle': <Sun size={18} />,
  'total-electron-content': <BarChart3 size={18} />,
}

export function SpaceWeatherIndex() {
  return (
    <div className="space-y-10 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-text-primary">
          Clima Espacial
        </h1>
        <p className="mt-3 text-base text-text-secondary leading-relaxed">
          El clima espacial describe las condiciones variables en el Sol, el viento solar y el
          entorno cercano a la Tierra que pueden afectar infraestructuras tecnológicas y actividades
          humanas. Explora los impactos en los sistemas tecnológicos y los fenómenos solares y
          geomagnéticos que los producen.
        </p>
      </div>

      {/* Impacts */}
      <section>
        <h2 className="font-display text-lg font-bold uppercase tracking-wider text-primary mb-4">
          Impactos
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Cómo el clima espacial afecta a las redes eléctricas, los sistemas de navegación, las
          comunicaciones y los satélites.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {IMPACTS.map((a) => (
            <CardLink
              key={a.slug}
              href={`/space-weather/impacts/${a.slug}`}
              title={a.title}
              summary={a.summary}
              icon={IMPACT_ICONS[a.slug]}
            />
          ))}
        </div>
      </section>

      {/* Phenomena */}
      <section>
        <h2 className="font-display text-lg font-bold uppercase tracking-wider text-primary mb-4">
          Fenómenos
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Los procesos solares, magnetosféricos e ionosféricos que impulsan el clima espacial.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PHENOMENA.map((a) => (
            <CardLink
              key={a.slug}
              href={`/space-weather/phenomena/${a.slug}`}
              title={a.title}
              summary={a.summary}
              icon={PHENOMENON_ICONS[a.slug]}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function CardLink({
  href,
  title,
  summary,
  icon,
}: {
  href: string
  title: string
  summary: string
  icon?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-lg border border-border bg-background-secondary p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      {icon && (
        <span className="mt-1 shrink-0 text-text-muted group-hover:text-primary transition-colors">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="mt-2 text-xs text-text-muted leading-relaxed line-clamp-3">
          {summary}
        </p>
      </div>
    </Link>
  )
}
