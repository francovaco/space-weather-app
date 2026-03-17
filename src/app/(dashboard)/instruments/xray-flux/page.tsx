import type { Metadata } from 'next'
import { XRayFluxClient } from '@/components/instruments/XRayFluxClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Flujo de Rayos X' }

export default function XRayFluxPage() {
  return <XRayFluxClient />
}
