import type { Metadata } from 'next'
import { SolarSynopticClient } from '@/components/instruments/SolarSynopticClient'

export const metadata: Metadata = { title: 'Mapa Solar Sinóptico' }

export default function SolarSynopticPage() {
  return <SolarSynopticClient />
}
