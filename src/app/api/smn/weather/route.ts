import { NextRequest, NextResponse } from 'next/server'

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res
    } catch (e) {
      if (i === retries - 1) throw e
      // Wait 500ms before retry
      await new Promise(r => setTimeout(r, 500))
    }
  }
  throw new Error('Fetch failed after retries')
}

export async function GET(req: NextRequest) {
  let lat = parseFloat(req.nextUrl.searchParams.get('lat') || '')
  let lon = parseFloat(req.nextUrl.searchParams.get('lon') || '')
  let isFromGPS = !isNaN(lat) && !isNaN(lon)

  // 1. Detect location headers
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

  const fixedLat = lat.toFixed(4)
  const fixedLon = lon.toFixed(4)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const queryParams = `latitude=${fixedLat}&longitude=${fixedLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,uv_index,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,moonrise,moonset,moon_phase,wind_speed_10m_max,precipitation_probability_max,surface_pressure_max,relative_humidity_2m_mean,visibility_max&timezone=auto&alerts=true`
    
    const weatherFetch = async () => {
      try {
        return await fetchWithRetry(`https://api.open-meteo.com/v1/forecast?${queryParams}`, { 
          signal: controller.signal, 
          next: { revalidate: 900 } 
        })
      } catch (e) {
        console.warn('Primary weather API failed, trying mirror...')
        return await fetchWithRetry(`https://geocoding-api.open-meteo.com/v1/forecast?${queryParams}`, { 
          signal: controller.signal,
          cache: 'no-store'
        }).catch(() => {
           // Last resort: minimal data but try to keep it functional
           return fetchWithRetry(`https://api.open-meteo.com/v1/forecast?latitude=${fixedLat}&longitude=${fixedLon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`, { signal: controller.signal })
        })
      }
    }

    const [weatherRes, geoRes, spaceAlertsRes, smnCapRes] = await Promise.all([
      weatherFetch().catch(e => { console.error('All Weather Mirrors Failed:', e); return null; }),
      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${fixedLat}&longitude=${fixedLon}&localityLanguage=es`,
        { signal: controller.signal, next: { revalidate: 86400 } }
      ).catch(() => null),
      fetch('https://services.swpc.noaa.gov/products/alerts.json', { signal: controller.signal, next: { revalidate: 300 } }).catch(() => null),
      fetch('https://ssl.smn.gob.ar/CAP/AR.php', { signal: controller.signal, next: { revalidate: 300 } }).catch(() => null)
    ])

    clearTimeout(timeoutId)
    
    if (!weatherRes || !weatherRes.ok) {
      throw new Error(`Weather API returned ${weatherRes?.status || 'no response'}`)
    }

    const data = await weatherRes.json()
    const geoData = geoRes && geoRes.ok ? await geoRes.json() : null
    const spaceAlertsRaw = spaceAlertsRes && spaceAlertsRes.ok ? await spaceAlertsRes.json() : []
    const cityName = geoData?.principalSubdivision || geoData?.city || geoData?.locality || 'Ubicación Detectada'

    const alerts: any[] = []

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
        humidity: data.current.relative_humidity_2m || 0,
        st: data.current.apparent_temperature || data.current.temperature_2m,
        is_day: data.current.is_day === 1,
        wind_speed: data.current.wind_speed_10m || 0,
        wind_direction: data.current.wind_direction_10m || 0,
        pressure: data.current.surface_pressure || 1013,
        visibility: (data.current.visibility || 0) / 1000,
        weather_id: data.current.weather_code,
        uv_index: data.current.uv_index || 0,
        precipitation: data.current.precipitation || 0,
        sunrise: data.daily?.sunrise?.[0] || '',
        sunset: data.daily?.sunset?.[0] || '',
        moonrise: data.daily?.moonrise?.[0] || '',
        moon_phase: data.daily?.moon_phase?.[0] || 0
      },
      forecast: (data.daily?.time || []).map((time: string, i: number) => ({
        date: time,
        max: data.daily?.temperature_2m_max?.[i] ?? 0,
        min: data.daily?.temperature_2m_min?.[i] ?? 0,
        weather_id: data.daily?.weather_code?.[i] ?? 0,
        wind_speed: data.daily?.wind_speed_10m_max?.[i] ?? 0,
        humidity: data.daily?.relative_humidity_2m_mean?.[i] ? Math.round(data.daily.relative_humidity_2m_mean[i]) : 50,
        pressure: data.daily?.surface_pressure_max?.[i] ?? data.current?.surface_pressure ?? 1013,
        visibility: data.daily?.visibility_max?.[i] ? (data.daily.visibility_max[i] / 1000) : 15,
        precipitation_prob: data.daily?.precipitation_probability_max?.[i] ?? 0,
        description: getDesc(data.daily?.weather_code?.[i] ?? 0)
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
