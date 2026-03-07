'use client'
// ============================================================
// src/components/docs/PDFThumbnail.tsx
// Renders the first page of a PDF to a <canvas> using pdf.js
// Loads pdf.js from CDN — no additional npm package needed.
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { FileText, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// pdf.js CDN version — matches a stable release
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

// Proxy URL builder
function proxyUrl(pdfUrl: string) {
  return `/api/docs/proxy?url=${encodeURIComponent(pdfUrl)}`
}

// Singleton promise so we only load pdf.js once
let pdfJsPromise: Promise<void> | null = null

function loadPdfJs(): Promise<void> {
  if (pdfJsPromise) return pdfJsPromise
  pdfJsPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve()
    // Already loaded
    if ((window as any).pdfjsLib) return resolve()

    const script = document.createElement('script')
    script.src = PDFJS_CDN
    script.onload = () => {
      ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
  return pdfJsPromise
}

interface PDFThumbnailProps {
  /** Original PDF URL — will be proxied automatically */
  pdfUrl: string
  /** Width of the rendered canvas in pixels */
  width?: number
  className?: string
}

type ThumbnailState = 'idle' | 'loading' | 'ready' | 'error'

export function PDFThumbnail({ pdfUrl, width = 280, className }: PDFThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<ThumbnailState>('idle')

  useEffect(() => {
    let cancelled = false
    setState('loading')

    async function render() {
      try {
        await loadPdfJs()
        if (cancelled) return

        const pdfjsLib = (window as any).pdfjsLib
        if (!pdfjsLib) throw new Error('pdf.js no disponible')

        const proxied = proxyUrl(pdfUrl)
        const loadingTask = pdfjsLib.getDocument({
          url: proxied,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/`,
          cMapPacked: true,
        })

        const pdf = await loadingTask.promise
        if (cancelled) return

        const page = await pdf.getPage(1)
        if (cancelled) return

        const canvas = canvasRef.current
        if (!canvas) return

        // Scale to desired width maintaining aspect ratio
        const unscaled = page.getViewport({ scale: 1 })
        const scale = width / unscaled.width
        const viewport = page.getViewport({ scale })

        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise

        if (!cancelled) setState('ready')
      } catch (err) {
        console.warn('[PDFThumbnail] Error rendering:', pdfUrl, err)
        if (!cancelled) setState('error')
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [pdfUrl, width])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-background-secondary',
        className
      )}
      style={{ width, minHeight: Math.round(width * 1.294) }} // A4 ratio
    >
      {/* Canvas — always in DOM so ref works */}
      <canvas
        ref={canvasRef}
        className={cn(
          'block w-full transition-opacity duration-300',
          state === 'ready' ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Loading overlay */}
      {state === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background-secondary">
          <Loader2 size={20} className="animate-spin text-primary" />
          <span className="text-2xs text-text-muted">Cargando vista previa…</span>
        </div>
      )}

      {/* Error / idle fallback */}
      {(state === 'error' || state === 'idle') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background-secondary">
          {state === 'error' ? (
            <>
              <AlertTriangle size={20} className="text-text-dim" />
              <span className="text-2xs text-text-muted">Vista previa no disponible</span>
            </>
          ) : (
            <FileText size={28} className="text-text-dim" />
          )}
        </div>
      )}

      {/* PDF badge overlay */}
      {state === 'ready' && (
        <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-2xs font-medium text-white">
          PDF
        </div>
      )}
    </div>
  )
}
