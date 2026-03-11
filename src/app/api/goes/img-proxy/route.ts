// src/app/api/goes/img-proxy/route.ts
// Proxies NOAA CDN images — adds Referer to bypass hotlink protection
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) return new NextResponse('missing url', { status: 400 })

  try {
    const { hostname } = new URL(raw)
    const isNoaa = hostname.endsWith('.noaa.gov')
    
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }

    if (isNoaa) {
      headers['Referer'] = 'https://www.star.nesdis.noaa.gov/'
      headers['Origin'] = 'https://www.star.nesdis.noaa.gov'
    }

    const upstream = await fetch(raw, {
      headers,
      cache: 'no-store',
    })

    if (!upstream.ok) {
      console.error(`[img-proxy] upstream ${upstream.status} for ${raw}`)
      return new NextResponse(`upstream ${upstream.status}`, { status: upstream.status })
    }

    const ct  = upstream.headers.get('content-type') ?? 'image/jpeg'
    // Timestamped frames are immutable → cache 24h; symlinks update every 10 min → 5 min
    const maxAge = /\/\d{11}_/.test(raw) ? 86400 : 300

    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type':  ct,
        'Cache-Control': `public, max-age=${maxAge}`,
      },
    })
  } catch (err) {
    console.error('[img-proxy] error:', raw, err)
    return new NextResponse('proxy error', { status: 502 })
  }
}
