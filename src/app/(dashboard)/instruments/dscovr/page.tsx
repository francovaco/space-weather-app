// ============================================================
// src/app/(dashboard)/instruments/dscovr/page.tsx
// DSCOVR IMF (Interplanetary Magnetic Field) Instrument Page
// ============================================================
import { Metadata } from 'next'
import { DSCOVRClient } from '@/components/instruments/DSCOVRClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'DSCOVR IMF (Magnetómetro L1) | GOES-19 Monitor',
  description: 'Monitoreo del campo magnético interplanetario y componente Bz desde el punto de Lagrange L1.',
}

export default function DSCOVRPage() {
  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      <DSCOVRClient />
    </main>
  )
}
