import type { Metadata } from 'next'
import { SUVIClient } from '@/components/instruments/SUVIClient'

export const metadata: Metadata = { title: 'SUVI Ultravioleta Solar' }

export default function SUVIPage() {
  return <SUVIClient />
}
