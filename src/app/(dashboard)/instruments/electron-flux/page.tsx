import type { Metadata } from 'next'
import { ElectronFluxClient } from '@/components/instruments/ElectronFluxClient'

export const metadata: Metadata = { title: 'Flujo de Electrones' }

export default function ElectronFluxPage() {
  return <ElectronFluxClient />
}
