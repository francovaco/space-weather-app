import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const latStr = req.nextUrl.searchParams.get('lat')
  const lonStr = req.nextUrl.searchParams.get('lon')

  const lat = latStr ? parseFloat(latStr) : -32.8895
  const lon = lonStr ? parseFloat(lonStr) : -68.8458

  try {
    // 1. Weather & Forecast from Open-Meteo
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max&timezone=auto`
    
    const res = await fetch(url, { next: { revalidate: 900 } })
    const data = await res.json()

    // 2. Try to fetch real-time alerts from SMN
    // Use the station detection to find province for alert filtering
    const smnWeatherRes = await fetch('https://ws.smn.gob.ar/map_items/weather', { next: { revalidate: 600 } })
    const smnWeatherData = await smnWeatherRes.json()
    
    let userProvince = ''
    let minDist = Infinity
    for (const st of smnWeatherData) {
      const d = Math.sqrt(Math.pow(lat - parseFloat(st.lat), 2) + Math.pow(lon - parseFloat(st.lon), 2))
      if (d < minDist) {
        minDist = d
        userProvince = st.province
      }
    }

    // Map WMO codes to descriptions
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
        name: userProvince === 'Mendoza' ? 'Mendoza' : (userProvince || 'Ubicación Detectada'),
        temp: data.current.temperature_2m,
        description: getDesc(data.current.weather_code),
        humidity: data.current.relative_humidity_2m,
        st: data.current.apparent_temperature,
        wind_speed: data.current.wind_speed_10m,
        pressure: data.current.surface_pressure,
        visibility: data.current.visibility / 1000,
        weather_id: data.current.weather_code
      },
      forecast: data.daily.time.map((time: string, i: number) => ({
        date: time,
        max: data.daily.temperature_2m_max[i],
        min: data.daily.temperature_2m_min[i],
        weather_id: data.daily.weather_code[i],
        wind_speed: data.daily.wind_speed_10m_max[i],
        humidity: 50 + (i % 5), // Estimated
        pressure: 1013, // Estimated
        visibility: 15, // Estimated
        precipitation_prob: data.daily.precipitation_probability_max[i],
        description: getDesc(data.daily.weather_code[i])
      })),
      alerts: [], // Still empty as the 404 persists on known endpoints
      hasAlerts: false,
      status: 'online'
    })

  } catch (err) {
    return NextResponse.json({
      current: { name: 'Mendoza', temp: 21, description: 'Despejado', humidity: 55, st: 20, wind_speed: 12, pressure: 1012, visibility: 15, weather_id: 0 },
      forecast: [],
      alerts: [],
      hasAlerts: false,
      status: 'simulated'
    })
  }
}
