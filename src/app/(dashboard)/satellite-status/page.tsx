// ============================================================
// src/app/(dashboard)/satellite-status/page.tsx
// ============================================================
import type { Metadata } from 'next'
import { SatelliteStatusClient } from '@/components/satellite-status/SatelliteStatusClient'

export const metadata: Metadata = { title: 'Estado del Satélite' }

export default function SatelliteStatusPage() {
  return <SatelliteStatusClient />
}
