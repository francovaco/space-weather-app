import { NextResponse } from 'next/server'

export async function GET() {
  const PRIMARY_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
  
  try {
    const res = await fetch(PRIMARY_URL, { 
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
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
    console.error('[Kp API] Primary failed, attempting fallback...', err.message)
    
    // Fallback to 1-minute data if primary 3-hour data fails
    try {
      const fbRes = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json', { cache: 'no-store' })
      if (!fbRes.ok) throw new Error('Fallback failed')
      
      const fbRaw = await fbRes.json()
      // Aggregate 1m data into 3h windows
      // This is a simplified version: just group by 3h blocks
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
            station_count: 0
          }
        }
      })
      
      const data = Object.values(aggregated).sort((a, b) => a.time_tag.localeCompare(b.time_tag))
      return NextResponse.json(data)
    } catch (fbErr: any) {
      return NextResponse.json({ error: 'All NOAA sources failed' }, { status: 503 })
    }
  }
}
