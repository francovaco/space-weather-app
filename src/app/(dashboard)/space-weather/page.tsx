// ============================================================
// src/app/(dashboard)/space-weather/page.tsx
// Index page — card grid with Impacts + Phenomena
// ============================================================
import type { Metadata } from 'next'
import { SpaceWeatherIndex } from '@/components/space-weather/SpaceWeatherIndex'

export const metadata: Metadata = { title: 'Clima Espacial' }

export default function SpaceWeatherPage() {
  return <SpaceWeatherIndex />
}
