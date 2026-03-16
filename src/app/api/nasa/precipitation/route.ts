import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
  }

  try {
    const now = new Date()
    const end = new Date(now)
    const start = new Date(now)
    start.setDate(now.getDate() - 35) // Buffer for lag

    const formatDate = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '')
    const NASA_BASE = process.env.NEXT_PUBLIC_NASA_POWER_API || 'https://power.larc.nasa.gov/api'
    
    const url = `${NASA_BASE}/temporal/daily/point?parameters=PRECTOTCORR&community=RE&longitude=${lon}&latitude=${lat}&start=${formatDate(start)}&end=${formatDate(end)}&format=JSON`

    const precipController = new AbortController()
    const precipTimeoutId = setTimeout(() => precipController.abort(), 10000)
    const res = await fetch(url, { signal: precipController.signal, cache: 'no-store' })
    clearTimeout(precipTimeoutId)
    if (!res.ok) throw new Error('NASA POWER API failed')
    
    const data = await res.json()
    const precip = data.properties.parameter.PRECTOTCORR
    
    // Sort keys (dates) and filter out -999 (NASA's null value)
    const dates = Object.keys(precip)
      .filter(date => precip[date] !== -999)
      .sort((a, b) => Number(b) - Number(a))
    
    if (dates.length === 0) {
      return NextResponse.json({ last24h: null, last7d: 0, monthTotal: 0 })
    }

    const latestDate = dates[0]
    const last24h = precip[latestDate]
    
    let last7d = 0
    for (let i = 0; i < Math.min(7, dates.length); i++) {
      const val = precip[dates[i]]
      if (val !== null && val !== -999) last7d += val
    }

    let monthTotal = 0
    for (let i = 0; i < Math.min(30, dates.length); i++) {
      const val = precip[dates[i]]
      if (val !== null && val !== -999) monthTotal += val
    }

    // Format latest date for display (YYYYMMDD to YYYY-MM-DD)
    const formattedLatest = `${latestDate.substring(0, 4)}-${latestDate.substring(4, 6)}-${latestDate.substring(6, 8)}`

    return NextResponse.json({
      last24h,
      last7d,
      monthTotal,
      latestDate: formattedLatest,
      source: 'NASA GPM/IMERG via POWER'
    })

  } catch (err) {
    console.error('[API/nasa/precipitation]', err)
    return NextResponse.json({ error: 'Failed to fetch NASA data' }, { status: 500 })
  }
}
