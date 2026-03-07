// ============================================================
// src/app/layout.tsx — Root layout
// ============================================================
import type { Metadata } from 'next'
import { Space_Mono, Orbitron, JetBrains_Mono } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from './providers'
import { AppShell } from '@/components/layout/AppShell'

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
})

const orbitron = Orbitron({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | GOES-19 Space Weather',
    default: 'GOES-19 Space Weather',
  },
  description:
    'Real-time space weather monitoring using GOES-19 satellite data. ' +
    'X-ray flux, proton flux, magnetometer, ABI imagery, aurora forecasts and more.',
  keywords: [
    'space weather',
    'GOES-19',
    'NOAA',
    'SWPC',
    'solar flares',
    'aurora',
    'satellite imagery',
    'magnetometer',
    'proton flux',
    'electron flux',
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${spaceMono.variable} ${orbitron.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
