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
        // Final fallback if everything fails
        lat = -32.8895 
        lon = -68.8458
      }
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    // 2. Parallel Fetch: Weather + City Name
    const [weatherRes, geoRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max,surface_pressure_max,relative_humidity_2m_mean,visibility_max&timezone=auto`,
        { signal: controller.signal, next: { revalidate: 900 } }
      ),
      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`,
        { signal: controller.signal, next: { revalidate: 86400 } }
      ).catch(() => null)
    ])

    clearTimeout(timeoutId)
    const data = await weatherRes.json()
    const geoData = geoRes ? await geoRes.json() : null

    // Prioritize Province (principalSubdivision) as requested
    let cityName = geoData?.principalSubdivision || geoData?.city || geoData?.locality || 'Ubicación Detectada'

    const getDesc = (code: number) => {
      if (code === 0) return 'Despejado'
      if (code <= 3) return 'Parcialmente Nublado'
      if (code <= 48) return 'Bruma / Niebla'
      if (code <= 67) return 'Lluvia'
      if (code <= 82) return 'Chaparrones'
      if (code >= 95) return 'Tormentas'
      return 'Nublado'
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
        visibility: data.current.visibility / 1000,
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
      status: 'online'
    })

  } catch (err) {
    console.error('Weather API Timeout/Error - Using Offline Data')
    const forecast = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      forecast.push({
        date: d.toISOString().split('T')[0],
        max: 22 + (i % 3),
        min: 14 + (i % 2),
        weather_id: 0,
        wind_speed: 10 + (i % 5),
        humidity: 45 + (i % 10),
        pressure: 1012 + (i % 4),
        visibility: 15,
        precipitation_prob: 0,
        description: 'Despejado'
      })
    }

    return NextResponse.json({
      current: {
        name: isFromGPS ? 'Ubicación Detectada' : 'Mi Ubicación',
        temp: 22,
        description: 'Despejado',
        humidity: 45,
        st: 21,
        wind_speed: 12,
        pressure: 1012,
        visibility: 15,
        weather_id: 0
      },
      forecast,
      status: 'offline'
    })
  }
}
