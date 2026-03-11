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
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    // REQUEST 1: Core Weather Data
    const coreUrl = `https://api.open-meteo.com/v1/forecast?latitude=${fixedLat}&longitude=${fixedLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,uv_index,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,wind_speed_10m_max,precipitation_sum,precipitation_probability_max&timezone=auto`

    // REQUEST 2: Models Comparison
    const modelsUrl = `https://api.open-meteo.com/v1/forecast?latitude=${fixedLat}&longitude=${fixedLon}&models=ecmwf_ifs04,gfs_seamless&daily=temperature_2m_max,wind_speed_10m_max,precipitation_sum&timezone=auto`

    const [weatherRes, modelsRes, geoRes] = await Promise.all([
      fetch(coreUrl, { signal: controller.signal, next: { revalidate: 900 } }),
      fetch(modelsUrl, { signal: controller.signal, next: { revalidate: 3600 } }).catch(() => null),
      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${fixedLat}&longitude=${fixedLon}&localityLanguage=es`,
        { signal: controller.signal, next: { revalidate: 86400 } }
      ).catch(() => null)
    ])

    clearTimeout(timeoutId)
    
    if (!weatherRes.ok) throw new Error(`Weather API failed: ${weatherRes.status}`)

    const data = await weatherRes.json()
    const modelsData = modelsRes && modelsRes.ok ? await modelsRes.json() : null
    const geoData = geoRes && geoRes.ok ? await geoRes.json() : null
    const cityName = geoData?.city || geoData?.locality || 'Ubicación Detectada'

    const getDesc = (code: number) => {
      if (code === 0) return 'Despejado'
      if (code <= 2) return 'Parcialmente Nublado'
      if (code <= 48) return 'Nublado'
      if (code <= 82) return 'Lluvia'
      if (code <= 77) return 'Nieve / Aguanieve'
      return 'Tormenta Eléctrica'
    }

    const getModelVal = (field: string, modelName: string, index: number) => {
      const key = `${field}_${modelName}`
      return modelsData?.daily?.[key]?.[index] ?? null
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
        sunset: data.daily?.sunset?.[0] ?? ''
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
        models: {
          ecmwf: {
            temp: getModelVal('temperature_2m_max', 'ecmwf_ifs04', i),
            wind: getModelVal('wind_speed_10m_max', 'ecmwf_ifs04', i),
            rain: getModelVal('precipitation_sum', 'ecmwf_ifs04', i)
          },
          gfs: {
            temp: getModelVal('temperature_2m_max', 'gfs_seamless', i),
            wind: getModelVal('wind_speed_10m_max', 'gfs_seamless', i),
            rain: getModelVal('precipitation_sum', 'gfs_seamless', i)
          }
        }
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
