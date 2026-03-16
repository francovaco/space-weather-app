import type { Metadata } from 'next'
import { SpaceWeatherOverviewClient } from '@/components/instruments/SpaceWeatherOverviewClient'

export const metadata: Metadata = { title: 'Panorama del Clima Espacial' }

export default function SpaceWeatherOverviewPage() {
  return <SpaceWeatherOverviewClient />
}
