import { Metadata } from 'next'
import { WAMIPEClient } from '@/components/instruments/WAMIPEClient'

export const metadata: Metadata = {
  title: 'WAM-IPE — Modelo Atmosférico e Ionosférico',
  description: 'Whole Atmosphere Model – Ionosphere Plasmasphere Electrodynamics: nowcast y pronóstico de la termósfera e ionósfera',
}

export default function WAMIPEPage() {
  return <WAMIPEClient />
}
