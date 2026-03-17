import type { Metadata } from 'next'
import { SatelliteEnvironmentClient } from '@/components/instruments/SatelliteEnvironmentClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Entorno Satélite' }

export default function SatelliteEnvironmentPage() {
  return <SatelliteEnvironmentClient />
}
