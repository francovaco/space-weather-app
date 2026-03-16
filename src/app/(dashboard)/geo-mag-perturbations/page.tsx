import type { Metadata } from 'next'
import { GeoMagPerturbationsClient } from '@/components/instruments/GeoMagPerturbationsClient'

export const metadata: Metadata = {
  title: 'Perturbaciones Magnéticas Terrestres',
}

export default function GeoMagPerturbationsPage() {
  return <GeoMagPerturbationsClient />
}
