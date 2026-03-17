// @ts-check
import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Next.js instrumentation hook (loads Sentry server/edge configs)
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.star.nesdis.noaa.gov',
        pathname: '/GOES19/**',
      },
      {
        protocol: 'https',
        hostname: 'services.swpc.noaa.gov',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'www.swpc.noaa.gov',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'www.ospo.noaa.gov',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
          // Cache control for satellite images (10 min)
          { key: 'Cache-Control', value: 's-maxage=600, stale-while-revalidate=59' },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI output during builds when DSN is not set
  silent: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Disable source map upload if no auth token provided
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Disable telemetry
  telemetry: false,
  // Don't fail build if Sentry upload fails
  hideSourceMaps: true,
})
