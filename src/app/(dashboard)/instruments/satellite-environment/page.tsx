import type { Metadata } from 'next'
import { SatelliteEnvironmentClient } from '@/components/instruments/SatelliteEnvironmentClient'

export const metadata: Metadata = { title: 'Entorno Satélite' }

export default function SatelliteEnvironmentPage() {
  return <SatelliteEnvironmentClient />
}
