import { CTIPEClient } from '@/components/instruments/CTIPEClient'

export const metadata = {
  title: 'CTIPe Forecast | Space Weather',
  description: 'Total Electron Content (TEC) Forecast from CTIPe model.',
}

export default function CTIPEPage() {
  return (
    <main className="container-page">
      <CTIPEClient />
    </main>
  )
}
