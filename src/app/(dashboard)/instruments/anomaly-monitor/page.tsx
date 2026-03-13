// ============================================================
// src/app/(dashboard)/instruments/anomaly-monitor/page.tsx
// Satellite Anomaly Monitor Page
// ============================================================
import { Metadata } from 'next'
import { AnomalyMonitorClient } from '@/components/instruments/AnomalyMonitorClient'

export const metadata: Metadata = {
  title: 'Monitor de Anomalías Satelitales | GOES-19 Monitor',
  description: 'Correlación de reportes NASA DONKI con picos de radiación de GOES-19.',
}

export default function AnomalyMonitorPage() {
  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      <AnomalyMonitorClient />
    </main>
  )
}
