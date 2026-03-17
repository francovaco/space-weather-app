// ============================================================
// src/app/layout.tsx — Root layout
// ============================================================
import type { Metadata, Viewport } from 'next'
import { Space_Mono, Orbitron, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import '@/styles/globals.css'
import { Providers } from './providers'
import { AppShell } from '@/components/layout/AppShell'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'

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

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
  colorScheme: 'dark',
}

export const metadata: Metadata = {
  title: {
    template: '%s | GOES-19 Clima Espacial',
    default: 'GOES-19 Clima Espacial',
  },
  description:
    'Monitoreo de clima espacial en tiempo real con datos del satélite GOES-19. ' +
    'Flujo de rayos X, flujo de protones, magnetómetro, imágenes ABI, pronósticos de aurora y más.',
  keywords: [
    'clima espacial',
    'GOES-19',
    'NOAA',
    'SWPC',
    'llamaradas solares',
    'aurora',
    'imágenes satelitales',
    'magnetómetro',
    'flujo de protones',
    'flujo de electrones',
  ],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clima Espacial',
  },
  icons: {
    icon: [
      { url: '/app-logo.png', type: 'image/png' },
      { url: '/app-logo.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: '/app-logo.png',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${spaceMono.variable} ${orbitron.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/app-logo-sq.png?v=3" />
        <link rel="apple-touch-icon" href="/app-logo-sq.png?v=3" />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
          <ServiceWorkerRegistration />
        </Providers>
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","vx97z7u07u");`,
          }}
        />
      </body>
    </html>
  )
}
