import type { Metadata } from 'next'
import { SolarCycleClient } from '@/components/instruments/SolarCycleClient'

export const metadata: Metadata = { title: 'Progresión del Ciclo Solar' }

export default function SolarCyclePage() {
  return <SolarCycleClient />
}
