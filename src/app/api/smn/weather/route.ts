import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  let lat = parseFloat(req.nextUrl.searchParams.get('lat') || '')
  let lon = parseFloat(req.nextUrl.searchParams.get('lon') || '')
  
  if (isNaN(lat) || isNaN(lon)) {
    lat = -32.8895
    lon = -68.8458
  }

  const fixedLat = lat.toFixed(4)
  const fixedLon = lon.toFixed(4)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    // 1. Peticiones en paralelo: Clima, Astronomía (Luna) y Geocodificación
    const [weatherRes, astroRes, geoRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${fixedLat}&longitude=${fixedLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,uv_index,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,wind_speed_10m_max,precipitation_sum,precipitation_probability_max&timezone=auto`,
        { signal: controller.signal, next: { revalidate: 900 } }
      ),
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${fixedLat}&longitude=${fixedLon}&daily=moonrise,moonset,moon_phase&timezone=auto`,
        { signal: controller.signal, next: { revalidate: 3600 } }
      ).catch(() => null),
      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${fixedLat}&longitude=${fixedLon}&localityLanguage=es`,
        { signal: controller.signal, next: { revalidate: 86400 } }
      ).catch(() => null)
    ])

    clearTimeout(timeoutId)
    
    if (!weatherRes.ok) throw new Error('Weather API failed')

    const data = await weatherRes.json()
    const astroData = astroRes ? await astroRes.json() : null
    const geoData = geoRes ? await geoRes.json() : null
    const cityName = geoData?.city || geoData?.locality || 'Ubicación Detectada'

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
        temp: data.current?.temperature_2m ?? 0,
        description: getDesc(data.current?.weather_code ?? 0),
        humidity: data.current?.relative_humidity_2m ?? 0,
        st: data.current?.apparent_temperature ?? data.current?.temperature_2m ?? 0,
        is_day: data.current?.is_day === 1,
        wind_speed: data.current?.wind_speed_10m ?? 0,
        wind_direction: data.current?.wind_direction_10m ?? 0,
        pressure: data.current?.surface_pressure ?? 1013,
        visibility: (data.current?.visibility || 0) / 1000,
        weather_id: data.current?.weather_code ?? 0,
        uv_index: data.current?.uv_index ?? 0,
        precipitation: data.current?.precipitation ?? 0,
        sunrise: data.daily?.sunrise?.[0] ?? '',
        sunset: data.daily?.sunset?.[0] ?? '',
        moonrise: astroData?.daily?.moonrise?.[0] ?? '',
        moon_phase: astroData?.daily?.moon_phase?.[0] ?? 0
      },
      forecast: (data.daily?.time || []).map((time: string, i: number) => ({
        date: time,
        max: data.daily.temperature_2m_max?.[i] ?? 0,
        min: data.daily.temperature_2m_min?.[i] ?? 0,
        weather_id: data.daily.weather_code?.[i] ?? 0,
        description: getDesc(data.daily.weather_code?.[i] ?? 0),
        sunrise: data.daily.sunrise?.[i] ?? '',
        sunset: data.daily.sunset?.[i] ?? '',
        uv_index: data.daily.uv_index_max?.[i] ?? 0,
        wind_speed: data.daily.wind_speed_10m_max?.[i] ?? 0,
        precipitation: data.daily.precipitation_sum?.[i] ?? 0,
        precipitation_prob: data.daily.precipitation_probability_max?.[i] ?? 0,
        moonrise: astroData?.daily?.moonrise?.[i] ?? '',
        moon_phase: astroData?.daily?.moon_phase?.[i] ?? 0
      })),
      alerts: [],
      hasAlerts: false,
      status: 'online'
    })

  } catch (err) {
    console.error('Weather API Error:', err)
    return NextResponse.json({
      current: null, forecast: [], alerts: [], hasAlerts: false, status: 'error'
    })
  }
}
