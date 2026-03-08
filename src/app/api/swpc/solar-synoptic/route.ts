import { NextResponse } from 'next/server'

const SYNOPTIC_URL = 'https://services.swpc.noaa.gov/images/synoptic-map.jpg'

export async function GET() {
  return NextResponse.json({
    url: SYNOPTIC_URL,
    updated: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } })
}
