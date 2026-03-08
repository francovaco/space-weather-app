import type { Metadata } from 'next'
import { XRayFluxClient } from '@/components/instruments/XRayFluxClient'

export const metadata: Metadata = { title: 'Flujo de Rayos X' }

export default function XRayFluxPage() {
  return <XRayFluxClient />
}
