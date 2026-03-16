// ============================================================
// src/app/api/docs/proxy/route.ts
// Proxies external PDFs server-side to avoid CORS restrictions
// when pdf.js tries to load them from the browser.
// Usage: /api/docs/proxy?url=https://...
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

// Allowlist of trusted PDF domains
const ALLOWED_DOMAINS = [
  'goes-r.gov',
  'www.goes-r.gov',
  'cimss.ssec.wisc.edu',
  'www.swpc.noaa.gov',
  'swpc.noaa.gov',
]

function isDomainAllowed(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return ALLOWED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    )
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url')

  if (!rawUrl) {
    return NextResponse.json({ error: 'Parámetro url requerido' }, { status: 400 })
  }

  if (!isDomainAllowed(rawUrl)) {
    return NextResponse.json({ error: 'Dominio no permitido' }, { status: 403 })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  try {
    const upstream = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; space-weather-app/0.1; +https://localhost)',
        Accept: 'application/pdf,*/*',
      },
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Error al obtener PDF: ${upstream.status}` },
        { status: 502 }
      )
    }

    const buffer = await upstream.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('[API/docs/proxy]', rawUrl, err)
    return NextResponse.json({ error: 'Error al obtener el documento' }, { status: 500 })
  } finally {
    clearTimeout(timeoutId)
  }
}
