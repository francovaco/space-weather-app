import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  let lat = parseFloat(req.nextUrl.searchParams.get('lat') || '')
  let lon = parseFloat(req.nextUrl.searchParams.get('lon') || '')
  let isFromGPS = !isNaN(lat) && !isNaN(lon)

  // 1. Detect location headers (Vercel/Cloudflare fallback)
  if (!isFromGPS) {
    const headerLat = req.headers.get('x-vercel-ip-latitude')
    const headerLon = req.headers.get('x-vercel-ip-longitude')
    if (headerLat && headerLon) {
      lat = parseFloat(headerLat)
      lon = parseFloat(headerLon)
    } else {
      try {
        // IP-to-Geo fallback for local development or missing headers
        const ipRes = await fetch('https://ipapi.co/json/', { next: { revalidate: 3600 } })
        if (ipRes.ok) {
          const ipData = await ipRes.json()
          if (ipData.latitude && ipData.longitude) {
            lat = ipData.latitude
            lon = ipData.longitude
          } else {
            throw new Error('IP geo failed')
          }
        } else {
          throw new Error('IP service down')
        }
      } catch (e) {
        // No location could be detected
        return NextResponse.json({ current: null, forecast: [], alerts: [], hasAlerts: false, status: 'no-location' })
      }
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    // 2. Parallel Fetch: Weather + City Name
    const [weatherRes, geoRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max,surface_pressure_max,relative_humidity_2m_mean,visibility_max&timezone=auto&alerts=true`,
        { signal: controller.signal, next: { revalidate: 900 } }
      ),
      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`,
        { signal: controller.signal, next: { revalidate: 86400 } }
      ).catch(() => null)
    ])

    clearTimeout(timeoutId)
    
    if (!weatherRes.ok) {
      const errText = await weatherRes.text()
      console.error('Open-Meteo Error:', errText)
      throw new Error('Weather service failure')
    }

    const data = await weatherRes.json()
    const geoData = geoRes ? await geoRes.json() : null

    // Determine City/Province Name early for alert filtering
    const cityName = geoData?.principalSubdivision || geoData?.city || geoData?.locality || 'Ubicación Detectada'

    // 3. Process Alerts from Open-Meteo (Safely)
    const alerts = Array.isArray(data.alerts) 
      ? data.alerts.map((a: any) => ({
          title: a.headline || a.event || 'Alerta Meteorológica',
          description: a.description || '',
          severity: a.severity || 'unknown',
          expires: a.expires || null,
          type: 'SAT'
        }))
      : []

    // 4. Try to fetch SMN Short-term Warnings (ACP)
    try {
      const smnCapRes = await fetch('https://ssl.smn.gob.ar/CAP/AR.php', { signal: controller.signal, next: { revalidate: 300 } })
      if (smnCapRes.ok) {
        const capXml = await smnCapRes.text()
        const items = capXml.match(/<item>[\s\S]*?<\/item>/g) || []
        
        items.forEach(item => {
          const titleMatch = item.match(/<title>(.*?)<\/title>/)
          const descMatch = item.match(/<description>(.*?)<\/description>/)
          const linkMatch = item.match(/<link>(.*?)<\/link>/)
          
          if (titleMatch && descMatch) {
            const title = titleMatch[1].replace('<![CDATA[', '').replace(']]>', '')
            const description = descMatch[1].replace('<![CDATA[', '').replace(']]>', '')
            const link = linkMatch ? linkMatch[1] : ''

            const isShortTerm = link.toLowerCase().includes('short_term') || description.toLowerCase().includes('corto plazo')
            
            // Filter by city or province name
            const locationInDesc = description.toLowerCase().includes(cityName.toLowerCase()) || 
                                   (geoData?.city && description.toLowerCase().includes(geoData.city.toLowerCase())) ||
                                   (geoData?.locality && description.toLowerCase().includes(geoData.locality.toLowerCase()))

            if (isShortTerm && locationInDesc) {
              alerts.unshift({
                title: `AVISO CORTO PLAZO: ${title}`,
                description: description,
                severity: 'Extreme',
                expires: null,
                type: 'ACP'
              })
            }
          }
        })
      }
    } catch (e) {
      console.error('SMN CAP fetch error:', e)
    }

    const getDesc = (code: number) => {
      if (code === 0) return 'Despejado'
      if (code <= 3) return 'Parcialmente Nublado'
      if (code <= 48) return 'Bruma / Niebla'
      if (code <= 67) return 'Lluvia'
      if (code <= 82) return 'Chaparrones'
      if (code >= 95) return 'Tormentas'
      return 'Nublado'
    }

    if (!data.current) {
       throw new Error('Incomplete weather data')
    }

    return NextResponse.json({
      current: {
        name: cityName,
        temp: data.current.temperature_2m,
        description: getDesc(data.current.weather_code),
        humidity: data.current.relative_humidity_2m,
        st: data.current.apparent_temperature,
        wind_speed: data.current.wind_speed_10m,
        pressure: data.current.surface_pressure,
        visibility: (data.current.visibility || 0) / 1000,
        weather_id: data.current.weather_code
      },
      forecast: (data.daily?.time || []).map((time: string, i: number) => ({
        date: time,
        max: data.daily.temperature_2m_max?.[i] ?? 0,
        min: data.daily.temperature_2m_min?.[i] ?? 0,
        weather_id: data.daily.weather_code?.[i] ?? 0,
        wind_speed: data.daily.wind_speed_10m_max?.[i] ?? 0,
        humidity: data.daily.relative_humidity_2m_mean?.[i] ? Math.round(data.daily.relative_humidity_2m_mean[i]) : 50,
        pressure: data.daily.surface_pressure_max?.[i] ?? data.current.surface_pressure,
        visibility: data.daily.visibility_max?.[i] ? (data.daily.visibility_max[i] / 1000) : 15,
        precipitation_prob: data.daily.precipitation_probability_max?.[i] ?? 0,
        description: getDesc(data.daily.weather_code?.[i] ?? 0)
      })),
      alerts,
      hasAlerts: alerts.length > 0,
      status: 'online'
    })

  } catch (err) {
    console.error('Weather API Error:', err)
    return NextResponse.json({
      current: null,
      forecast: [],
      alerts: [],
      hasAlerts: false,
      status: 'error'
    })
  }
}
