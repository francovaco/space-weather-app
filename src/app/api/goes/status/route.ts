// ============================================================
// src/app/api/goes/status/route.ts
// Proxies NOAA OSPO GOES status page (parsed HTML)
// ============================================================
import { NextResponse } from 'next/server'

const STATUS_URL = 'https://www.ospo.noaa.gov/operations/goes/status.html'

export async function GET() {
  try {
    const res = await fetch(STATUS_URL, {
      next: { revalidate: 300 },
      headers: {
        'User-Agent': 'space-weather-app/0.1',
        Accept: 'text/html',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Could not fetch status page' }, { status: 502 })
    }

    const html = await res.text()

    // Return raw HTML for client to parse, or add server-side parsing here
    // For now returns metadata + raw HTML (client does lightweight parsing)
    return NextResponse.json(
      {
        sourceUrl: STATUS_URL,
        fetchedAt: new Date().toISOString(),
        html,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=280, s-maxage=300',
        },
      }
    )
  } catch (err) {
    console.error('[API/goes/status]', err)
    return NextResponse.json({ error: 'Failed to fetch GOES status' }, { status: 500 })
  }
}
