import { NextRequest, NextResponse } from 'next/server'

const SWPC_BASE = 'https://services.swpc.noaa.gov'

const VIEW_PATHS: Record<string, string> = {
  'density': '/images/animations/geospace/density/',
  'pressure': '/images/animations/geospace/pressure/',
  'velocity': '/images/animations/geospace/velocity/',
}

// Filename format: magnetosphere_cut_planes_density_20260309T1500_20260309T1610.png
// We use the second timestamp (valid time)
function parseTimestamp(filename: string): string | null {
  const matches = filename.match(/(\d{8}T\d{4})/g)
  if (!matches || matches.length < 2) return null
  
  // Take the second timestamp (end/valid time)
  const ts = matches[matches.length - 1]
  const Y = ts.slice(0, 4), M = ts.slice(4, 6), D = ts.slice(6, 8)
  const h = ts.slice(9, 11), m = ts.slice(11, 13)
  
  return `${Y}-${M}-${D}T${h}:${m}:00Z`
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? 'density'
  const dirPath = VIEW_PATHS[type] ?? VIEW_PATHS['density']

  try {
    const res = await fetch(`${SWPC_BASE}${dirPath}`, {
      next: { revalidate: 60 },
      headers: { 'User-Agent': 'space-weather-app/0.1' },
    })
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const html = await res.text()
    
    // Match filenames like: magnetosphere_cut_planes_density_....png
    // The prefix depends on the type (density/pressure/velocity)
    const filePrefix = `magnetosphere_cut_planes_${type}`
    
    // Regex to find hrefs ending in .png that match our prefix
    // We use a flexible regex for quotes and path
    const regex = new RegExp(`href=["']?([^"'>]*${filePrefix}[^"'>]*\\.png)["']?`, 'gi')
    const pngMatches = html.match(regex) ?? []
    
    const filenames = pngMatches
      .map((m) => {
        const parts = m.match(/href=["']?([^"'>]+\.png)["']?/i)
        if (!parts) return null
        const url = parts[1]
        // Extract just the filename if it's a path
        if (url.includes('/')) {
          const segments = url.split('/')
          return segments[segments.length - 1]
        }
        return url
      })
      .filter((f): f is string => f !== null && f.startsWith(filePrefix))

    // Deduplicate
    const uniqueFiles = Array.from(new Set(filenames))
    
    const frames = uniqueFiles.map((f) => ({
      url: `${SWPC_BASE}${dirPath}${f}`,
      time_tag: parseTimestamp(f) ?? '',
    }))
    
    // Filter out invalid timestamps and sort
    const validFrames = frames
      .filter(f => f.time_tag !== '')
      .sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())

    return NextResponse.json(validFrames, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    })
  } catch (err) {
    console.error('[API/magnetosphere]', err)
    return NextResponse.json({ error: 'Failed to fetch magnetosphere frames' }, { status: 500 })
  }
}
