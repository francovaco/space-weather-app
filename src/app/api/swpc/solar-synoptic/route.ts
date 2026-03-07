import { NextResponse } from 'next/server'

const SYNOPTIC_URL = 'https://services.swpc.noaa.gov/images/solar-synoptic-map.gif'

export async function GET() {
  // Return the image URL for client-side rendering
  return NextResponse.json({
    url: SYNOPTIC_URL,
    updated: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } })
}
