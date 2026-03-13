// ============================================================
// src/app/(dashboard)/instruments/ground-mag/page.tsx
// Ground Magnetometer (INTERMAGNET) Instrument Page
// ============================================================
import { Metadata } from 'next'
import { GroundMagClient } from '@/components/instruments/GroundMagClient'

export const metadata: Metadata = {
  title: 'Magnetómetros Terrestres (INTERMAGNET) | GOES-19 Monitor',
  description: 'Monitoreo global de desviaciones magnéticas en superficie desde la red INTERMAGNET.',
}

export default function GroundMagPage() {
  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      <GroundMagClient />
    </main>
  )
}
