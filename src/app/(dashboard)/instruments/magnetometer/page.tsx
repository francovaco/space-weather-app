import type { Metadata } from 'next'
import { MagnetometerClient } from '@/components/instruments/MagnetometerClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Magnetómetro' }

export default function MagnetometerPage() {
  return <MagnetometerClient />
}
