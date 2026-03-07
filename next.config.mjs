/** @type {import('next').NextConfig} */
const nextConfig = {
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
        ],
      },
    ]
  },
}

export default nextConfig
