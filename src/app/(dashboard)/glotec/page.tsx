import { Metadata } from 'next'
import { GLOTECClient } from '@/components/instruments/GLOTECClient'

export const metadata: Metadata = {
  title: 'GloTEC — Contenido Total de Electrones',
  description: 'Global Total Electron Content: Monitoreo global de la densidad de electrones en la ionósfera en tiempo real.',
}

export default function GLOTECPage() {
  return <GLOTECClient />
}
