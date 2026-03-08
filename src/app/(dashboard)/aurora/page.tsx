import type { Metadata } from 'next'
import { AuroraClient } from '@/components/instruments/AuroraClient'

export const metadata: Metadata = { title: 'Pronóstico de Aurora' }

export default function AuroraPage() {
  return <AuroraClient />
}
