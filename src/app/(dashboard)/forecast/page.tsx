import type { Metadata } from 'next'
import { ForecastDashboard } from '@/components/forecast/ForecastDashboard'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Predicción del Clima Espacial' }

export default function ForecastPage() {
  return <ForecastDashboard />
}
