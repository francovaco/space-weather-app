import type { Metadata } from 'next'
import { CoronagraphClient } from '@/components/instruments/CoronagraphClient'

export const metadata: Metadata = { title: 'Coronógrafo' }

export default function CoronagraphPage() {
  return <CoronagraphClient />
}
