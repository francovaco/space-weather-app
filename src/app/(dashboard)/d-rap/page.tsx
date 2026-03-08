import { Metadata } from 'next'
import { DRAPClient } from '@/components/instruments/DRAPClient'

export const metadata: Metadata = {
  title: 'D-RAP — Predicción de Absorción Región D',
  description: 'Predicción de absorción de señales de radio HF en la región D de la ionósfera',
}

export default function DRAPPage() {
  return <DRAPClient />
}
