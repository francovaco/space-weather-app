import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
  async rewrites() {
    return []
  },
}

export default nextConfig
