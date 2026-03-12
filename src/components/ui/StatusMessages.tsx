'use client'
import { AlertCircle, ImageOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusProps {
  message?: string
  description?: string
  className?: string
}

/**
 * Standard loading state for dashboard cards and animation players
 */
export function LoadingMessage({ message = 'Cargando datos...', className }: StatusProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-24 gap-3', className)}>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Loader2 size={14} className="animate-spin text-accent-cyan" />
        {message}
      </div>
    </div>
  )
}

/**
 * Standard error state
 */
export function ErrorMessage({ 
  message = 'Error al cargar los datos', 
  description = 'No se han podido obtener los datos por el momento.',
  className 
}: StatusProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-24 gap-2 text-center px-4', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-red-400">
        <AlertCircle size={16} />
        {message}
      </div>
      {description && (
        <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}

/**
 * Standard empty/no-data state
 */
export function EmptyMessage({ 
  message = 'No hay datos disponibles', 
  description = 'La información no se encuentra disponible en este momento.',
  className 
}: StatusProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-24 gap-2 text-center px-4', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-text-muted">
        <ImageOff size={16} />
        {message}
      </div>
      {description && (
        <p className="text-xs text-text-dim max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}

/**
 * Loading state for preloading animation frames
 */
export function PreloadProgress({ progress, className }: { progress: number; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-3', className)}>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Loader2 size={14} className="animate-spin text-accent-cyan" />
        Precargando imágenes… {progress}%
      </div>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-accent-cyan transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
