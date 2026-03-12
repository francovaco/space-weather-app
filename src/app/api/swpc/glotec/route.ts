import { NextRequest, NextResponse } from 'next/server'

const SWPC_BASE = 'https://services.swpc.noaa.gov'

const VIEW_PATHS: Record<string, Record<string, string>> = {
  atlantic: {
    tec: '/images/animations/glotec/100asm_urt/',
    anomaly: '/images/animations/glotec/anomaly_urt/',
    ray: '/images/animations/glotec/ray_urt/',
  },
  pacific: {
    tec: '/images/animations/glotec/100asmp_urt/',
    anomaly: '/images/animations/glotec/anomalyp_urt/',
    ray: '/images/animations/glotec/rayp_urt/',
  },
}

// Parse timestamp from filenames like:
// glotec_100asm_urt_20260308T011500.png
// glotec_anomaly_urt_20260308T011500.png
function parseTimestamp(filename: string): string | null {
  const match = filename.match(/_(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.png$/i)
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`
}

export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get('view') ?? 'atlantic'
  const type = req.nextUrl.searchParams.get('type') ?? 'tec'
  
  const typeMap = VIEW_PATHS[view] ?? VIEW_PATHS['atlantic']
  const dirPath = typeMap[type] ?? typeMap['tec']

  try {
    const res = await fetch(`${SWPC_BASE}${dirPath}`, {
      next: { revalidate: 300 }, // 5-minute server-side cache
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const html = await res.text()
    const pngMatches = html.match(/href="([^"]+\.png)"/g) ?? []
    const filenames = pngMatches
      .map((m) => m.replace('href="', '').replace('"', ''))
      .filter((f) => f !== 'latest.png')
      // Sort to get newest last (for animation player)
      .sort()
      .slice(-150) // Limit to avoid overloading

    const frames = filenames.map((f) => {
      let fullUrl = f
      if (!fullUrl.startsWith('http')) {
        const path = f.startsWith('/') ? f : `${dirPath}${f}`
        fullUrl = `${SWPC_BASE}${path}`
      }
      return {
        url: fullUrl,
        time_tag: parseTimestamp(f) ?? '',
      }
    })

    return NextResponse.json(frames, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600' },
    })
  } catch (err) {
    console.error('[API/glotec]', err)
    return NextResponse.json({ error: 'Failed to fetch GloTEC frames' }, { status: 500 })
  }
}
