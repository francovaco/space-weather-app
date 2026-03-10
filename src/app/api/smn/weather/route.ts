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
        return NextResponse.json({ current: null, forecast: [], alerts: [], hasAlerts: false, status: 'no-location' })
      }
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    // 2. Parallel Fetch: Weather, Geo, Space Alerts, SMN CAP
    const [weatherRes, geoRes, spaceAlertsRes, smnCapRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,visibility,uv_index,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max,surface_pressure_max,relative_humidity_2m_mean,visibility_max&timezone=auto&alerts=true`,
        { signal: controller.signal, next: { revalidate: 900 } }
      ),
      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`,
        { signal: controller.signal, next: { revalidate: 86400 } }
      ).catch(() => null),
      fetch('https://services.swpc.noaa.gov/products/alerts.json', { signal: controller.signal, next: { revalidate: 300 } }).catch(() => null),
      fetch('https://ssl.smn.gob.ar/CAP/AR.php', { signal: controller.signal, next: { revalidate: 300 } }).catch(() => null)
    ])

    clearTimeout(timeoutId)
    
    const data = await weatherRes.json()
    const geoData = geoRes ? await geoRes.json() : null
    const spaceAlertsRaw = spaceAlertsRes ? await spaceAlertsRes.json() : []
    const cityName = geoData?.principalSubdivision || geoData?.city || geoData?.locality || 'Ubicación Detectada'

    const alerts: any[] = []

    // ─── TERRESTRIAL ALERTS (Open-Meteo & SMN CAP) ───

    // Open-Meteo SAT Alerts
    if (Array.isArray(data.alerts)) {
      data.alerts.forEach((a: any) => {
        alerts.push({
          title: a.headline || a.event || 'Alerta Meteorológica',
          description: a.description || '',
          severity: a.severity || 'Minor',
          type: 'SAT'
        })
      })
    }

    // SMN CAP (ACP, Incendios, Cenizas, Rayos)
    if (smnCapRes?.ok) {
      const capXml = await smnCapRes.text()
      const items = capXml.match(/<item>[\s\S]*?<\/item>/g) || []
      
      items.forEach(item => {
        const titleMatch = item.match(/<title>(.*?)<\/title>/)
        const descMatch = item.match(/<description>(.*?)<\/description>/)
        
        if (titleMatch && descMatch) {
          const title = titleMatch[1].replace('<![CDATA[', '').replace(']]>', '')
          const description = descMatch[1].replace('<![CDATA[', '').replace(']]>', '')
          const descLower = description.toLowerCase()
          
          const isRelevant = descLower.includes(cityName.toLowerCase()) || 
                            (geoData?.city && descLower.includes(geoData.city.toLowerCase()))
          
          if (isRelevant) {
            let type = 'SAT'
            let severity = 'Moderate'
            
            if (descLower.includes('corto plazo') || descLower.includes('acp')) {
              type = 'ACP'
              severity = 'Extreme'
            } else if (descLower.includes('ceniza') || descLower.includes('volcán')) {
              type = 'VOLCANIC'
              severity = 'Strong'
            } else if (descLower.includes('incendio') || descLower.includes('fuego')) {
              type = 'FIRE'
              severity = 'Strong'
            } else if (descLower.includes('eléctrica') || descLower.includes('rayos')) {
              type = 'LIGHTNING'
              severity = 'Strong'
            }

            alerts.unshift({
              title: `${type === 'ACP' ? 'AVISO CORTO PLAZO' : type}: ${title}`,
              description: description,
              severity: severity,
              type: type
            })
          }
        }
      })
    }

    // ─── SPACE WEATHER ALERTS (NOAA) ───
    if (Array.isArray(spaceAlertsRaw)) {
      const now = new Date()
      spaceAlertsRaw.slice(0, 10).forEach((msg: any) => {
        const issueTime = new Date(msg.issue_datetime)
        if (now.getTime() - issueTime.getTime() < 12 * 3600 * 1000) {
          const content = msg.message || ''
          if (content.includes('Solar Flare') || content.includes('Geomagnetic Storm') || content.includes('Radio Emission')) {
             let title = 'Evento de Clima Espacial'
             if (content.includes('Solar Flare')) title = 'Llamarada Solar (Alert)'
             if (content.includes('Geomagnetic Storm')) title = 'Tormenta Geomagnética'
             
             alerts.push({
               title: title,
               description: content.split('\n').slice(0, 2).join(' '),
               severity: 'Moderate',
               type: 'SPACE'
             })
          }
        }
      })
    }

    if (alerts.length > 20) {
       alerts.splice(20)
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

    if (!data.current) throw new Error('Incomplete weather data')

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
        weather_id: data.current.weather_code,
        uv_index: data.current.uv_index,
        precipitation: data.current.precipitation
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
      current: null, forecast: [], alerts: [], hasAlerts: false, status: 'error'
    })
  }
}
