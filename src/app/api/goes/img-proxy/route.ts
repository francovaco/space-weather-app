// ============================================================
// src/app/api/goes/img-proxy/route.ts
// Proxies NOAA CDN images adding the required Referer header
// that the CDN checks for hotlink protection.
// Usage: /api/goes/img-proxy?url=<encoded_cdn_url>
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOSTS = ['cdn.star.nesdis.noaa.gov', 'www.star.nesdis.noaa.gov']

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) return new NextResponse('missing url', { status: 400 })

  // Validate domain
  let hostname: string
  try {
    hostname = new URL(raw).hostname
  } catch {
    return new NextResponse('invalid url', { status: 400 })
  }
  if (!ALLOWED_HOSTS.includes(hostname)) {
    return new NextResponse('domain not allowed', { status: 403 })
  }

  try {
    const upstream = await fetch(raw, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Referer:  'https://www.star.nesdis.noaa.gov/',
        Origin:   'https://www.star.nesdis.noaa.gov',
        Accept:   'image/webp,image/jpeg,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      // Disable Next.js fetch cache — we set our own Cache-Control on the response
      cache: 'no-store',
    })

    if (!upstream.ok) {
      // Return a transparent 1×1 GIF so the <img> doesn't break the layout
      return new NextResponse(
        Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
        { status: 200, headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } }
      )
    }

    const buf = await upstream.arrayBuffer()
    const ct  = upstream.headers.get('content-type') ?? 'image/jpeg'

    // Timestamped images (e.g. 20260661900_...) never change → cache 1 day
    // Symlink images (e.g. 600x600.jpg) change every 10 min → cache 5 min
    const isStatic = /\d{11}_/.test(raw)
    const maxAge   = isStatic ? 86400 : 300

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type':  ct,
        'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('[img-proxy] fetch error:', err)
    return new NextResponse('proxy error', { status: 502 })
  }
}
