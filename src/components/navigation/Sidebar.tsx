'use client'
// ============================================================
// src/components/navigation/Sidebar.tsx
// ============================================================
import Link from 'next/link'
import NextImage from 'next/image'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import {
  Satellite, BookOpen, Activity, Image as ImageIcon, Zap, Radio,
  Sun, Wind, Eye, Globe, ChevronDown, ChevronRight,
  Gauge, Layers, SunDim, BarChart3, CloudSun, BrainCircuit,
  Info, Shield, Orbit, Repeat2, GitCompare, AlertTriangle, Magnet, LayoutDashboard, TrendingUp, Radiation, Rocket,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  badge?: string
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Panel Principal',
    href: '/',
    icon: <Gauge size={15} />,
  },
  {
    label: 'Panorama Espacial',
    href: '/space-weather-overview',
    icon: <LayoutDashboard size={15} />,
  },
  {
    label: 'Documentación',
    href: '/documentation',
    icon: <BookOpen size={15} />,
  },
  {
    label: 'Estado del Satélite',
    href: '/satellite-status',
    icon: <Satellite size={15} />,
  },
  {
    label: 'SWFO-L1 · Solar-1',
    href: '/swfo-l1',
    icon: <Rocket size={15} />,
    badge: 'Próx.',
  },
  {
    label: 'Imágenes ABI',
    href: '/imagery',
    icon: <ImageIcon size={15} />,
  },
  {
    label: 'Instrumentos',
    icon: <Activity size={15} />,
    children: [
      { label: 'Magnetómetro GOES', href: '/instruments/magnetometer', icon: <Gauge size={13} /> },
      { label: 'Magnetómetro DSCOVR', href: '/instruments/dscovr', icon: <Globe size={13} /> },
      { label: 'Flujo de Rayos X', href: '/instruments/xray-flux', icon: <Zap size={13} /> },
      { label: 'Flujo de Electrones', href: '/instruments/electron-flux', icon: <Radio size={13} /> },
      { label: 'Flujo de Protones', href: '/instruments/proton-flux', icon: <Activity size={13} /> },
      { label: 'Modo Comparativo', href: '/analysis/comparison', icon: <GitCompare size={13} /> },
      { label: 'SUVI Ultravioleta', href: '/instruments/suvi', icon: <Sun size={13} /> },
      { label: 'Coronógrafo', href: '/instruments/coronagraph', icon: <Eye size={13} /> },
      { label: 'Entorno Satélite', href: '/instruments/satellite-environment', icon: <Layers size={13} /> },
      { label: 'Monitor de Anomalías', href: '/instruments/anomaly-monitor', icon: <AlertTriangle size={13} /> },
    ],
  },
  {
    label: 'Índice Kp',
    href: '/instruments/kp-index',
    icon: <BarChart3 size={15} />,
  },
  {
    label: 'Ciclo Solar',
    href: '/solar-cycle',
    icon: <TrendingUp size={15} />,
  },
  {
    label: 'Pronóstico de Aurora',
    href: '/aurora',
    icon: <SunDim size={15} />,
  },
  {
    label: 'Perturbaciones Magnéticas',
    href: '/geo-mag-perturbations',
    icon: <Magnet size={15} />,
  },
  {
    label: 'D-RAP Absorción HF',
    href: '/d-rap',
    icon: <Radio size={15} />,
  },
  {
    label: 'WAM-IPE Atmósfera/Ionósfera',
    href: '/wam-ipe',
    icon: <BrainCircuit size={15} />,
  },
  {
    label: 'Magnetósfera Geospace',
    href: '/instruments/magnetosphere',
    icon: <Shield size={15} />,
  },
  {
    label: 'GloTEC Contenido Electrones',
    href: '/glotec',
    icon: <Layers size={15} />,
  },
  {
    label: 'CTIPe Pronóstico TEC',
    href: '/ctipe',
    icon: <Orbit size={15} />,
  },
  {
    label: 'Viento Solar',
    href: '/solar-wind',
    icon: <Wind size={15} />,
  },
  {
    label: 'Mapa Solar Sinóptico',
    href: '/solar-synoptic',
    icon: <Globe size={15} />,
  },
  {
    label: 'Clima Espacial',
    icon: <Info size={15} />,
    children: [
      { label: 'Introducción', href: '/space-weather', icon: <CloudSun size={13} /> },
      {
        label: 'Impactos',
        icon: <Zap size={13} />,
        children: [
          { label: 'Energía Eléctrica', href: '/space-weather/impacts/electric-power', icon: <Zap size={13} /> },
          { label: 'Sistemas GPS', href: '/space-weather/impacts/gps', icon: <Globe size={13} /> },
          { label: 'Radio HF', href: '/space-weather/impacts/hf-radio', icon: <Radio size={13} /> },
          { label: 'Com. Satelitales', href: '/space-weather/impacts/satellite-communications', icon: <Satellite size={13} /> },
          { label: 'Arrastre Satelital', href: '/space-weather/impacts/satellite-drag', icon: <Satellite size={13} /> },
        ],
      },
      {
        label: 'Fenómenos',
        icon: <Sun size={13} />,
        children: [
          { label: 'Aurora', href: '/space-weather/phenomena/aurora', icon: <SunDim size={13} /> },
          { label: 'Agujeros Coronales', href: '/space-weather/phenomena/coronal-holes', icon: <Sun size={13} /> },
          { label: 'CME', href: '/space-weather/phenomena/coronal-mass-ejections', icon: <Activity size={13} /> },
          { label: 'Magnetósfera', href: '/space-weather/phenomena/earths-magnetosphere', icon: <Globe size={13} /> },
          { label: 'Radio F10.7', href: '/space-weather/phenomena/f107-radio-emissions', icon: <Radio size={13} /> },
          { label: 'Rayos Cósmicos', href: '/space-weather/phenomena/galactic-cosmic-rays', icon: <Activity size={13} /> },
          { label: 'Tormentas Geomag.', href: '/space-weather/phenomena/geomagnetic-storms', icon: <Zap size={13} /> },
          { label: 'Ionósfera', href: '/space-weather/phenomena/ionosphere', icon: <Layers size={13} /> },
          { label: 'Centelleo Ionosf.', href: '/space-weather/phenomena/ionospheric-scintillation', icon: <Activity size={13} /> },
          { label: 'Cinturones Radiac.', href: '/space-weather/phenomena/radiation-belts', icon: <Globe size={13} /> },
          { label: 'Irradiancia EUV', href: '/space-weather/phenomena/solar-euv-irradiance', icon: <Sun size={13} /> },
          { label: 'Fulguraciones', href: '/space-weather/phenomena/solar-flares', icon: <Zap size={13} /> },
          { label: 'Tormenta Radiación', href: '/space-weather/phenomena/solar-radiation-storm', icon: <Activity size={13} /> },
          { label: 'Viento Solar', href: '/space-weather/phenomena/solar-wind', icon: <Wind size={13} /> },
          { label: 'Manchas Solares', href: '/space-weather/phenomena/sunspots-solar-cycle', icon: <Sun size={13} /> },
          { label: 'Electrones (TEC)', href: '/space-weather/phenomena/total-electron-content', icon: <BarChart3 size={13} /> },
        ],
      },
    ],
  },
]

export function Sidebar() {
  const { sidebarOpen } = useUIStore()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<string[]>(['Instrumentos'])

  const toggleExpand = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-background-secondary',
        'transition-all duration-300',
        sidebarOpen ? 'w-60' : 'w-14'
      )}
      aria-label="Barra lateral de navegación"
    >
      {/* Logo area */}
      <Link href="/" prefetch={false} className="flex h-14 items-center border-b border-border hover:bg-border/40 transition-colors">
        {sidebarOpen ? (
          <span className="font-display text-xs font-bold uppercase tracking-widest text-primary px-3">
            Monitor Espacial
          </span>
        ) : (
          <NextImage src="/assets/logo.png" alt="Logo" width={56} height={56} className="h-14 w-14 object-contain p-1" />
        )}
      </Link>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Navegación principal">
        <ul className="space-y-0.5 px-2" role="list">
          {NAV_ITEMS.map((item) => (
            <NavItemComponent
              key={item.label}
              item={item}
              pathname={pathname}
              collapsed={!sidebarOpen}
              expanded={expanded}
              onToggle={toggleExpand}
            />
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {sidebarOpen && (
        <div className="border-t border-border px-3 py-2">
          <p className="text-2xs text-text-muted">GOES-19 · NOAA/SWPC</p>
          <p className="text-2xs text-text-dim">v0.1.0</p>
        </div>
      )}
    </aside>
  )
}

// ---- Nav item recursive component ----

interface NavItemProps {
  item: NavItem
  pathname: string
  collapsed: boolean
  expanded: string[]
  onToggle: (label: string) => void
  depth?: number
}

function NavItemComponent({ item, pathname, collapsed, expanded, onToggle, depth = 0 }: NavItemProps) {
  const isActive = item.href ? pathname === item.href : false
  const isExpanded = expanded.includes(item.label)
  const hasChildren = !!item.children?.length
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [popoverOpen])

  const handlePopoverToggle = () => {
    if (!popoverOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      // Use the middle of the button as the anchor point for the middle of the popover
      const top = rect.top + rect.height / 2
      setPopoverPos({ top, left: rect.right + 4 })
    }
    setPopoverOpen(v => !v)
  }

  // Auto-scroll active item into view when popover opens
  const activeItemRef = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    if (popoverOpen && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'center', behavior: 'instant' as any })
    }
  }, [popoverOpen])

  const baseClass = cn(
    'flex items-center rounded text-xs transition-colors',
    'hover:bg-border/60 hover:text-text-primary',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-text-secondary',
    collapsed && depth === 0
      ? 'h-9 w-9 justify-center mx-auto'
      : 'gap-2 px-2 py-1.5 w-full',
    depth > 0 && !collapsed && 'pl-5'
  )

  if (hasChildren) {
    // Collapsed: show popover on click (fixed position to escape overflow)
    if (collapsed) {
      return (
        <li>
          <button
            ref={btnRef}
            className={baseClass}
            onClick={handlePopoverToggle}
            title={item.label}
            aria-label={item.label}
            aria-expanded={popoverOpen}
            aria-haspopup="true"
          >
            <span className="shrink-0">{item.icon}</span>
          </button>
          {popoverOpen && (
            <div
              ref={popoverRef}
              className="fixed z-[200] min-w-48 max-h-[min(90vh,600px)] -translate-y-1/2 overflow-y-auto rounded-md border border-border bg-background-secondary py-1 shadow-xl scroll-py-10"
              style={{ top: popoverPos.top, left: popoverPos.left }}
            >
              <p className="px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-text-muted">
                {item.label}
              </p>
              {item.children!.map((child) => {
                if (child.children) {
                  return (
                    <div key={child.label}>
                      <p className="px-3 pt-2 pb-1 text-2xs font-bold uppercase tracking-wider text-primary/70">
                        {child.label}
                      </p>
                      {child.children.map((sub) => {
                        const subActive = sub.href ? pathname === sub.href : false
                        return (
                          <Link
                            key={sub.label}
                            href={sub.href!}
                            prefetch={false}
                            ref={subActive ? activeItemRef : null}
                            onClick={() => setPopoverOpen(false)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                              'hover:bg-border/60 hover:text-text-primary',
                              subActive ? 'bg-primary/10 text-primary' : 'text-text-secondary'
                            )}
                          >
                            <span className="shrink-0">{sub.icon}</span>
                            <span>{sub.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )
                }
                const childActive = child.href ? pathname === child.href : false
                return (
                  <Link
                    key={child.label}
                    href={child.href!}
                    prefetch={false}
                    ref={childActive ? activeItemRef : null}
                    onClick={() => setPopoverOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                      'hover:bg-border/60 hover:text-text-primary',
                      childActive ? 'bg-primary/10 text-primary' : 'text-text-secondary'
                    )}
                  >
                    <span className="shrink-0">{child.icon}</span>
                    <span>{child.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </li>
      )
    }

    // Expanded sidebar: normal accordion
    return (
      <li>
        <button
          className={baseClass}
          onClick={() => onToggle(item.label)}
          aria-expanded={isExpanded}
          aria-label={item.label}
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        {isExpanded && (
          <ul className="mt-0.5 space-y-0.5">
            {item.children!.map((child) => (
              <NavItemComponent
                key={child.label}
                item={child}
                pathname={pathname}
                collapsed={collapsed}
                expanded={expanded}
                onToggle={onToggle}
                depth={depth + 1}
              />
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <li>
      <Link href={item.href!} prefetch={false} className={baseClass} title={collapsed ? item.label : undefined}>
        <span className="shrink-0">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="badge-live text-2xs">{item.badge}</span>
            )}
          </>
        )}
      </Link>
    </li>
  )
}
