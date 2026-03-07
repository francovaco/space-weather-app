'use client'
// ============================================================
// src/components/animation/AnimationPlayer.tsx
// Full-featured image loop player with canvas rendering
// ============================================================
import { useRef, useEffect, useCallback } from 'react'
import { useAnimationPlayer } from '@/hooks/useAnimationPlayer'
import { cn } from '@/lib/utils'
import type { AnimationFrame, FrameCount, PlaybackMode } from '@/types/animation'
import { FRAME_COUNT_OPTIONS } from '@/types/animation'
import {
  Play, Pause, SkipBack, SkipForward, Grid,
  RefreshCw, Download,
} from 'lucide-react'

interface AnimationPlayerProps {
  frames: AnimationFrame[]
  loading?: boolean
  error?: string
  onDownload?: () => void
  className?: string
}

export function AnimationPlayer({
  frames,
  loading,
  error,
  onDownload,
  className,
}: AnimationPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())

  const player = useAnimationPlayer({ frames })

  // Draw current frame to canvas
  const drawFrame = useCallback((frame: AnimationFrame | null) => {
    const canvas = canvasRef.current
    if (!canvas || !frame) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imageCache.current.get(frame.url)
    if (img?.complete) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Draw lat/lon grid overlay
      if (player.showGrid) {
        drawLatLonGrid(ctx, canvas.width, canvas.height)
      }
    }
  }, [player.showGrid])

  // Preload all frames into image cache
  useEffect(() => {
    frames.forEach((frame) => {
      if (!imageCache.current.has(frame.url)) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = frame.url
        imageCache.current.set(frame.url, img)
      }
    })
  }, [frames])

  // Redraw on frame change
  useEffect(() => {
    drawFrame(player.currentFrame)
  }, [player.currentFrame, drawFrame])

  const sliderValue = player.totalFrames > 0 ? player.currentIndex : 0
  const sliderMax = Math.max(0, player.totalFrames - 1)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Canvas */}
      <div className="relative overflow-hidden rounded-md bg-black scan-overlay">
        <canvas
          ref={canvasRef}
          width={1000}
          height={750}
          className="h-auto w-full"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <RefreshCw size={20} className="animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
        {/* Frame timestamp overlay */}
        {player.currentFrame && (
          <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 font-data text-2xs text-text-secondary">
            {new Date(player.currentFrame.timestamp).toISOString().replace('T', ' ').slice(0, 19)} UTC
          </div>
        )}
      </div>

      {/* Timeline slider */}
      <input
        type="range"
        min={0}
        max={sliderMax}
        value={sliderValue}
        onChange={(e) => player.goToFrame(parseInt(e.target.value, 10))}
        className="w-full accent-primary"
      />

      {/* Controls row */}
      <div className="player-controls flex-wrap">
        {/* Playback */}
        <button
          className="ctrl-btn"
          onClick={player.prevFrame}
          title="Cuadro anterior"
        >
          <SkipBack size={13} />
        </button>
        <button
          className="ctrl-btn"
          onClick={player.toggle}
          title={player.isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {player.isPlaying ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button
          className="ctrl-btn"
          onClick={player.nextFrame}
          title="Cuadro siguiente"
        >
          <SkipForward size={13} />
        </button>

        <div className="h-4 w-px bg-border" />

        {/* Speed */}
        <button className="ctrl-btn" onClick={player.increaseSpeed} title="Más rápido">
          <span className="text-2xs font-bold">+</span>
        </button>
        <span className="data-value text-text-muted">
          {Math.round(1000 / player.speedMs)}fps
        </span>
        <button className="ctrl-btn" onClick={player.decreaseSpeed} title="Más lento">
          <span className="text-2xs font-bold">−</span>
        </button>

        <div className="h-4 w-px bg-border" />

        {/* Frame count */}
        <select
          value={player.frameCount}
          onChange={(e) => player.setFrameCount(Number(e.target.value) as FrameCount)}
          className="rounded border border-border bg-background px-1 py-0.5 text-2xs text-text-secondary"
        >
          {FRAME_COUNT_OPTIONS.map((n) => (
            <option key={n} value={n}>{n} cuadros</option>
          ))}
        </select>

        {/* Mode */}
        <select
          value={player.mode}
          onChange={(e) => player.setMode(e.target.value as PlaybackMode)}
          className="rounded border border-border bg-background px-1 py-0.5 text-2xs text-text-secondary"
        >
          <option value="loop">Loop</option>
          <option value="rock">Vaivén</option>
        </select>

        <div className="h-4 w-px bg-border" />

        {/* Grid toggle */}
        <button
          className={cn('ctrl-btn', player.showGrid && 'active')}
          onClick={player.toggleGrid}
          title="Mostrar/ocultar grilla lat/lon"
        >
          <Grid size={13} />
        </button>

        {/* Download */}
        {onDownload && (
          <button
            className="ctrl-btn ml-auto"
            onClick={onDownload}
            title="Descargar animación"
          >
            <Download size={13} />
          </button>
        )}

        {/* Frame counter */}
        <span className="ml-auto data-value text-text-muted">
          {player.currentIndex + 1}/{player.totalFrames}
        </span>
      </div>
    </div>
  )
}

// ---- Lat/Lon grid helper (canvas 2D) ----

function drawLatLonGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.lineWidth = 0.5
  ctx.setLineDash([3, 4])
  ctx.font = '9px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'

  // Simple equidistant grid — 10° intervals (approximate for SSA sector)
  const COLS = 8
  const ROWS = 6

  for (let i = 0; i <= COLS; i++) {
    const x = (w / COLS) * i
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }

  for (let j = 0; j <= ROWS; j++) {
    const y = (h / ROWS) * j
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  ctx.restore()
}
