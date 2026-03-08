import { NextRequest, NextResponse } from 'next/server'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer':    'https://www.star.nesdis.noaa.gov/',
  'Accept':     'text/html,*/*',
}

export async function GET(req: NextRequest) {
  const band  = req.nextUrl.searchParams.get('band')
  const count = Math.min(Number(req.nextUrl.searchParams.get('count') ?? '24'), 240)
  if (!band) return NextResponse.json({ error: 'missing band' }, { status: 400 })

  const isGlm = band === 'EXTENT3'
  const dirUrl = isGlm
    ? 'https://cdn.star.nesdis.noaa.gov/GOES19/GLM/SECTOR/ssa/EXTENT3/'
    : `https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/SSA/${band}/`

  // ── Resolution filter: always 7200×4320 for both ABI and GLM ──
  const RES = '7200x4320'
  const re  = new RegExp(`href="(\\d{11}_GOES19-[^"]*?-${RES}\\.jpg)"`, 'gi')

  try {
    const res = await fetch(dirUrl, { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: `CDN ${res.status}`, dirUrl }, { status: 502 })

    const html = await res.text()
    const all: string[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) all.push(m[1])
    all.sort()

    return NextResponse.json(
      { frames: all.slice(-count), dirUrl, total: all.length, res: RES },
      { headers: { 'Cache-Control': 'public, max-age=120' } }
    )
  } catch (err) {
    return NextResponse.json({ error: String(err), dirUrl }, { status: 502 })
  }
}
