import { MagnetosphereClient } from '@/components/instruments/MagnetosphereClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Magnetósfera (Geospace) | GOES-19',
  description: 'Simulaciones en tiempo real de la magnetósfera terrestre (Geospace Movies) incluyendo densidad, presión y velocidad.',
}

export default function MagnetospherePage() {
  return <MagnetosphereClient />
}
