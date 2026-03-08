import type { Metadata } from 'next'
import { SolarWindClient } from '@/components/instruments/SolarWindClient'

export const metadata: Metadata = { title: 'Viento Solar WSA-ENLIL' }

export default function SolarWindPage() {
  return <SolarWindClient />
}
