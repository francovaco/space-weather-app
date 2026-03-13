'use client'

import { Download, FileJson, FileText } from 'lucide-react'
import { downloadCSV, downloadJSON } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface DataExporterProps {
  data: any[]
  filename: string
  className?: string
}

export function DataExporter({ data, filename, className }: DataExporterProps) {
  if (!data || data.length === 0) return null

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim mr-1">Exportar</span>
      
      <button
        onClick={() => downloadCSV(data, filename)}
        className="flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-background-secondary text-text-muted hover:text-text-primary hover:border-accent-amber transition-all group"
        title="Descargar CSV"
      >
        <FileText size={12} className="group-hover:text-accent-amber" />
        <span className="text-[10px] font-medium">CSV</span>
      </button>

      <button
        onClick={() => downloadJSON(data, filename)}
        className="flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-background-secondary text-text-muted hover:text-text-primary hover:border-accent-cyan transition-all group"
        title="Descargar JSON"
      >
        <FileJson size={12} className="group-hover:text-accent-cyan" />
        <span className="text-[10px] font-medium">JSON</span>
      </button>
    </div>
  )
}
