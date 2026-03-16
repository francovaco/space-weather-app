// src/app/api/goes/img-proxy/route.ts
// Proxies NOAA CDN images — adds Referer to bypass hotlink protection
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) return new NextResponse('missing url', { status: 400 })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
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
      signal: controller.signal,
      headers,
      cache: 'no-store',
    })

    if (!upstream.ok) {
      console.error(`[img-proxy] upstream ${upstream.status} for ${raw}`)
      // Use 404 for missing frames, 502 for all other upstream errors
      const status = upstream.status === 404 ? 404 : 502
      return new NextResponse(status === 404 ? 'not found' : 'upstream error', { status })
    }

    const ct  = upstream.headers.get('content-type') ?? 'image/jpeg'
    // Timestamped frames are immutable → cache 24h
    // Patterns: ABI (11 digits), LASCO/CCOR (YYYYMMDD_HHMM), SUVI (YYYYMMDDTHHMMSSZ), WAM-IPE (YYYYMMDDTHHMM), GloTEC (YYYYMMDDTHHMMSS)
    const isImmutable = /\/\d{11}_/.test(raw) || /\/\d{8}_\d{4}_/.test(raw) || /\/\d{8}T\d{6}Z_/.test(raw) || /\d{8}T\d{4}\.png$/.test(raw) || /\d{8}T\d{6}\.png$/.test(raw)
    const maxAge = isImmutable ? 86400 : 300

    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type':  ct,
        'Cache-Control': `public, max-age=${maxAge}`,
      },
    })
  } catch (err) {
    console.error('[API/goes/img-proxy]', raw, err)
    return new NextResponse('proxy error', { status: 502 })
  } finally {
    clearTimeout(timeoutId)
  }
}
