import type { Metadata } from 'next'
import { ProtonFluxClient } from '@/components/instruments/ProtonFluxClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Flujo de Protones' }

export default function ProtonFluxPage() {
  return <ProtonFluxClient />
}
