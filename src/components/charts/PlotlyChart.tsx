'use client'
// ============================================================
// src/components/charts/PlotlyChart.tsx
// Dark-themed Plotly.js wrapper for SWPC instrument data
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// We import Plotly lazily to avoid SSR issues
interface PlotlyChartProps {
  data: Plotly.Data[]
  layout?: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
  className?: string
  style?: React.CSSProperties
}

// Dark theme defaults matching NOAA/SWPC chart aesthetics
export const PLOTLY_DARK_LAYOUT: Partial<Plotly.Layout> = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'rgba(11,18,32,0.9)',
  font: {
    family: 'JetBrains Mono, Space Mono, monospace',
    size: 12,
    color: '#94a3b8',
  },
  xaxis: {
    gridcolor: 'rgba(30,45,66,0.8)',
    linecolor: '#1e2d42',
    tickcolor: '#1e2d42',
    zerolinecolor: '#1e2d42',
    tickfont: { size: 11, color: '#64748b' },
  },
  yaxis: {
    gridcolor: 'rgba(30,45,66,0.8)',
    linecolor: '#1e2d42',
    tickcolor: '#1e2d42',
    zerolinecolor: 'rgba(30,45,66,0.5)',
    tickfont: { size: 11, color: '#64748b' },
    exponentformat: 'e',
  },
  legend: {
    bgcolor: 'rgba(6,10,18,0.8)',
    bordercolor: '#1e2d42',
    borderwidth: 1,
    font: { size: 11, color: '#94a3b8' },
  },
  margin: { l: 60, r: 20, t: 30, b: 50 },
  hovermode: 'x unified',
  hoverlabel: {
    bgcolor: 'rgba(6,10,18,0.95)',
    bordercolor: '#1e2d42',
    font: { size: 11, color: '#e2e8f0', family: 'JetBrains Mono, monospace' },
  },
}

export const PLOTLY_DEFAULT_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: true,
  modeBarButtonsToRemove: [
    'select2d', 'lasso2d', 'toggleSpikelines',
    'hoverClosestCartesian', 'hoverCompareCartesian',
    'toImage',
  ],
  displaylogo: false,
  responsive: true,
  locale: 'es',
}

export function PlotlyChart({ data, layout, config, className, style }: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [plotly, setPlotly] = useState<typeof import('plotly.js-dist-min') | null>(null)

  // One-time Plotly import and locale registration
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const PlotlyModule = await import('plotly.js-dist-min')
      if (cancelled) return

      // Register Spanish locale
      PlotlyModule.register({
        moduleType: 'locale',
        name: 'es',
        dictionary: {
          'Zoom In': 'Acercar',
          'Zoom Out': 'Alejar',
          'Reset axes': 'Restablecer ejes',
          'Toggle Spike Lines': 'Alternar líneas guía',
          'Show closest data on hover': 'Mostrar dato más cercano',
          'Compare data on hover': 'Comparar datos',
          'Pan': 'Desplazar',
          'Zoom': 'Zoom',
          'Box Select': 'Selección rectangular',
          'Lasso Select': 'Selección lazo',
          'Orbital rotation': 'Rotación orbital',
          'Turntable rotation': 'Rotación de plato',
          'Reset camera to default': 'Restablecer cámara',
          'Reset camera to last save': 'Restablecer cámara al último guardado',
          'Autoscale': 'Autoescalar',
          'Reset': 'Restablecer',
          'Download plot as a png': 'Descargar gráfico como PNG',
          'Download plot': 'Descargar gráfico',
          'Edit in Chart Studio': 'Editar en Chart Studio',
          'Produced with Plotly.js': 'Creado con Plotly.js',
          'Trace': 'Traza',
          'trace': 'traza',
        },
        format: {
          days: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
          shortDays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
          months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
          shortMonths: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
          date: '%d/%m/%Y',
        },
      } as never)

      setPlotly(PlotlyModule)
    })()
    return () => {
      cancelled = true
      if (containerRef.current && plotly) {
        plotly.purge(containerRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update plot when data/layout/config change
  useEffect(() => {
    if (!plotly || !containerRef.current) return
    const mergedLayout = buildLayout(layout)
    const mergedConfig = buildConfig(plotly, config)
    plotly.react(containerRef.current, data, mergedLayout, mergedConfig)
  }, [plotly, data, layout, config])

  // Prevent page scroll when scrolling over chart
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (el.querySelector('.plotly')) e.preventDefault()
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn('plotly-dark min-h-64 w-full', className)}
      style={style}
    />
  )
}

function buildLayout(layout?: Partial<Plotly.Layout>): Partial<Plotly.Layout> {
  return {
    ...PLOTLY_DARK_LAYOUT,
    ...layout,
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, ...layout?.xaxis },
    yaxis: { ...PLOTLY_DARK_LAYOUT.yaxis, ...layout?.yaxis },
  }
}

function buildConfig(
  Plotly: typeof import('plotly.js-dist-min'),
  config?: Partial<Plotly.Config>,
): Partial<Plotly.Config> {
  const downloadBtn: Plotly.ModeBarButton = {
    name: 'downloadImage',
    title: 'Descargar imagen',
    icon: Plotly.Icons['camera'],
    click: async (gd: HTMLElement) => {
      const url = await Plotly.toImage(gd, { format: 'png', width: 1920, height: 720 })
      const a = document.createElement('a')
      a.href = url
      a.download = 'chart.png'
      a.click()
    },
  }
  const baseConfig = { ...PLOTLY_DEFAULT_CONFIG, ...config }
  return {
    ...baseConfig,
    modeBarButtonsToAdd: [downloadBtn, ...(baseConfig.modeBarButtonsToAdd ?? [])],
  }
}
