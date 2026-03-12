import { AlertTriangle, RefreshCw } from 'lucide-react'

interface WidgetErrorProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function WidgetError({ 
  title = 'Error de carga',
  message = 'No se pudieron obtener los datos.',
  onRetry 
}: WidgetErrorProps) {
  return (
    <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-background-card p-6 text-center">
      <div className="rounded-full bg-red-500/10 p-3">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-text-primary">{title}</h3>
        <p className="text-xs text-text-muted">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 flex items-center gap-2 rounded-md bg-background-secondary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-background-secondary/80 hover:text-text-primary transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reintentar
        </button>
      )}
    </div>
  )
}
