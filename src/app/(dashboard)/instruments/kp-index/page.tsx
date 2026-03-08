import type { Metadata } from 'next'
import { KpIndexClient } from '@/components/instruments/KpIndexClient'

export const metadata: Metadata = { title: 'Índice Planetario K' }

export default function KpIndexPage() {
  return <KpIndexClient />
}
