'use client'
// ============================================================
// src/components/navigation/Sidebar.tsx
// ============================================================
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import {
  Satellite, BookOpen, Activity, Image, Zap, Radio,
  Sun, Wind, Eye, Globe, ChevronDown, ChevronRight,
  Gauge, Layers, SunDim,
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
    label: 'Imágenes ABI',
    href: '/imagery',
    icon: <Image size={15} />,
  },
  {
    label: 'Instrumentos',
    icon: <Activity size={15} />,
    children: [
      { label: 'Magnetómetro', href: '/instruments/magnetometer', icon: <Gauge size={13} /> },
      { label: 'Flujo de Rayos X', href: '/instruments/xray-flux', icon: <Zap size={13} /> },
      { label: 'Flujo de Electrones', href: '/instruments/electron-flux', icon: <Radio size={13} /> },
      { label: 'Flujo de Protones', href: '/instruments/proton-flux', icon: <Activity size={13} /> },
      { label: 'SUVI Ultravioleta', href: '/instruments/suvi', icon: <Sun size={13} /> },
      { label: 'Coronógrafo', href: '/instruments/coronagraph', icon: <Eye size={13} /> },
      { label: 'Entorno Satélite', href: '/instruments/satellite-environment', icon: <Layers size={13} /> },
    ],
  },
  {
    label: 'Pronóstico de Aurora',
    href: '/aurora',
    icon: <SunDim size={15} />,
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
]

export function Sidebar() {
  const { sidebarOpen } = useUIStore()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<string[]>(['Instruments'])

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
    >
      {/* Logo area */}
      <div className="flex h-14 items-center border-b border-border px-3">
        {sidebarOpen ? (
          <span className="font-display text-xs font-bold uppercase tracking-widest text-primary">
            Monitor Espacial
          </span>
        ) : (
          <Activity size={18} className="mx-auto text-primary" />
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
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
      setPopoverPos({ top: rect.top, left: rect.right + 4 })
    }
    setPopoverOpen(v => !v)
  }

  const baseClass = cn(
    'flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors w-full',
    'hover:bg-border/60 hover:text-text-primary',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-text-secondary',
    depth > 0 && 'pl-5'
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
          >
            <span className="shrink-0">{item.icon}</span>
          </button>
          {popoverOpen && (
            <div
              ref={popoverRef}
              className="fixed z-[200] min-w-48 rounded-md border border-border bg-background-secondary py-1 shadow-xl"
              style={{ top: popoverPos.top, left: popoverPos.left }}
            >
              <p className="px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-text-muted">
                {item.label}
              </p>
              {item.children!.map((child) => {
                const childActive = child.href ? pathname === child.href : false
                return (
                  <Link
                    key={child.label}
                    href={child.href!}
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
        <button className={baseClass} onClick={() => onToggle(item.label)}>
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
      <Link href={item.href!} className={baseClass} title={collapsed ? item.label : undefined}>
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
