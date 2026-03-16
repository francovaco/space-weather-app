import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date') // YYYY-MM-DD

  if (dateParam) {
    // GFZ Potsdam provides excellent historical Kp data in JSON format
    // Get 3 days around the target date for context
    const target = new Date(dateParam)
    const s = new Date(target.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const e = new Date(target.getTime() + 48 * 60 * 60 * 1000).toISOString().split('T')[0]
    const GFZ_URL = `https://kp.gfz-potsdam.de/app/json/?start=${s}T00%3A00%3A00Z&end=${e}T23%3A59%3A59Z&index=Kp`

    const gfzController = new AbortController()
    const gfzTimeoutId = setTimeout(() => gfzController.abort(), 10000)
    try {
      const res = await fetch(GFZ_URL, { signal: gfzController.signal, cache: 'no-store' })
      if (!res.ok) throw new Error('GFZ API error')

      const raw = await res.json()

      // GFZ returns { "datetime": [...], "Kp": [...] }
      const data = raw.datetime.map((dt: string, i: number) => ({
        time_tag: dt,
        kp: raw.Kp[i],
        a_running: 0,
        station_count: 13, // GFZ is a network of 13 stations
      }))

      return NextResponse.json(data)
    } catch (err) {
      console.error('[API/kp-index] GFZ historical fetch failed', GFZ_URL, err)
      // Fall through to standard NOAA for "recent" historical if GFZ fails
    } finally {
      clearTimeout(gfzTimeoutId)
    }
  }

  const PRIMARY_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'

  const primaryController = new AbortController()
  const primaryTimeoutId = setTimeout(() => primaryController.abort(), 10000)
  try {
    const res = await fetch(PRIMARY_URL, {
      signal: primaryController.signal,
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const raw = await res.json()

    if (!Array.isArray(raw) || raw.length < 2) {
      throw new Error('Invalid JSON structure')
    }

    const data = raw.slice(1).map((row: any) => ({
      time_tag: row[0] ? row[0].replace(' ', 'T') + 'Z' : null,
      kp: parseFloat(row[1]),
      a_running: parseInt(row[2], 10) || 0,
      station_count: parseInt(row[3], 10) || 0,
    })).filter(d => d.time_tag && !isNaN(d.kp))

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API/kp-index] Primary failed, attempting fallback...', PRIMARY_URL, err.message)

    // Fallback to 1-minute data if primary 3-hour data fails
    const fallbackController = new AbortController()
    const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 10000)
    try {
      const fbRes = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json', {
        signal: fallbackController.signal,
        cache: 'no-store',
      })
      if (!fbRes.ok) throw new Error('Fallback failed')

      const fbRaw = await fbRes.json()
      // Aggregate 1m data into 3h windows
      const aggregated: Record<string, any> = {}

      fbRaw.forEach((item: any) => {
        const date = new Date(item.time_tag)
        const hour = date.getUTCHours()
        const windowHour = Math.floor(hour / 3) * 3
        date.setUTCHours(windowHour, 0, 0, 0)
        const key = date.toISOString()

        if (!aggregated[key] || item.estimated_kp > aggregated[key].kp) {
          aggregated[key] = {
            time_tag: key,
            kp: item.estimated_kp,
            a_running: 0,
            station_count: 0,
          }
        }
      })

      const data = Object.values(aggregated).sort((a, b) => a.time_tag.localeCompare(b.time_tag))
      return NextResponse.json(data)
    } catch (fbErr: any) {
      console.error('[API/kp-index] Fallback failed', 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json', fbErr)
      return NextResponse.json({ error: 'All NOAA sources failed' }, { status: 503 })
    } finally {
      clearTimeout(fallbackTimeoutId)
    }
  } finally {
    clearTimeout(primaryTimeoutId)
  }
}
