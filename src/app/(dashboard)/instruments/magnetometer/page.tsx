import type { Metadata } from 'next'
import { MagnetometerClient } from '@/components/instruments/MagnetometerClient'

export const metadata: Metadata = { title: 'Magnetómetro' }

export default function MagnetometerPage() {
  return <MagnetometerClient />
}
