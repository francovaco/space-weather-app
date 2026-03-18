# Arquitectura — GOES-19 Space Weather Monitor

## Vision general

La aplicacion es un **dashboard Next.js 14** con App Router que actua como capa de visualizacion sobre las APIs publicas de NOAA/SWPC y el satelite GOES-19. El cliente nunca llama a APIs externas directamente — todo el trafico pasa por API routes del servidor que aplican cache, headers CORS y transformaciones.

---

## Diagrama de flujo de datos

```
┌─────────────────────────────────────────────────┐
│              APIs Externas                       │
│  NOAA/SWPC · GOES-19 · NASA · GFZ · Open-Meteo  │
└──────────────────┬──────────────────────────────┘
                   │ fetch (server-side)
                   ▼
┌─────────────────────────────────────────────────┐
│           Next.js API Routes                     │
│   src/app/api/**                                 │
│   • Proxy CORS                                   │
│   • Cache: revalidate 60s                        │
│   • Headers: Cache-Control, X-Data-Source        │
│   • Transformacion / validacion                  │
└──────────────────┬──────────────────────────────┘
                   │ JSON sobre HTTP
                   ▼
┌─────────────────────────────────────────────────┐
│           TanStack Query v5                      │
│   hooks/useAutoRefresh.ts                        │
│   • Polling automatico por instrumento           │
│   • Stale-while-revalidate                       │
│   • Retry con backoff exponencial                │
└──────────────────┬──────────────────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
┌──────────────────┐  ┌─────────────────────────┐
│  Zustand stores  │  │  Componentes React       │
│  • uiStore       │  │  • Plotly charts         │
│  • animStore     │  │  • Canvas players        │
│  • notifStore    │  │  • Three.js 3D globes    │
│  (localStorage)  │  │  • MapLibre GL maps      │
└──────────────────┘  └─────────────────────────┘
```

---

## Patrones clave

### 1. Module-per-instrument

Cada instrumento sigue exactamente la misma estructura de 4 archivos:

```
1. Types      src/types/swpc.ts              ← definicion de tipos TS
2. API proxy  src/app/api/swpc/[inst]/route.ts ← GET handler + cache
3. Component  src/components/instruments/[Inst]Client.tsx ← UI
4. Page       src/app/(dashboard)/instruments/[inst]/page.tsx ← ruta
```

Este patron garantiza consistencia y facilita agregar nuevos instrumentos sin tocar archivos existentes.

### 2. Server-side proxy con cache

Todas las API routes siguen este template:

```typescript
// src/app/api/swpc/[instrumento]/route.ts
export async function GET(request: Request) {
  const res = await fetch(NOAA_URL, {
    next: { revalidate: 60 },          // ISR cache 60s
    headers: { 'Accept': 'application/json' }
  })

  const data = await res.json()

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=55, s-maxage=60',
      'X-Data-Source': 'NOAA/SWPC',
      'X-Last-Fetched': new Date().toISOString(),
    }
  })
}
```

### 3. Auto-refresh con TanStack Query

El hook `useAutoRefresh` encapsula la logica de polling:

```typescript
// Intervalos por instrumento (en produccion)
const INTERVALS = {
  magnetometer:   60_000,   // 1 min
  xray:           60_000,   // 1 min
  kp:             60_000,   // 1 min
  solar_wind:     60_000,   // 1 min
  electron_flux:  300_000,  // 5 min
  proton_flux:    300_000,  // 5 min
  aurora:         300_000,  // 5 min
  suvi:           300_000,  // 5 min
  coronagraph:    600_000,  // 10 min
  models:         600_000,  // 10 min
}
```

### 4. Zustand con hidratacion SSR segura

El store de UI usa el middleware `persist` de Zustand para guardar preferencias en localStorage, pero siempre con el patron `useUIHydrated` para evitar hydration mismatches:

```typescript
// stores/uiStore.ts
export const useUIStore = create(
  persist(
    (set) => ({ sidebarCollapsed: false, ... }),
    { name: 'ui-prefs' }
  )
)

// En componentes:
const hydrated = useUIHydrated()
if (!hydrated) return <Skeleton />
```

---

## Estructura de directorios

```
src/
├── app/
│   ├── (dashboard)/                 # Route group — todas las paginas
│   │   ├── page.tsx                 # Dashboard principal
│   │   ├── imagery/                 # Imagenes ABI GOES-19
│   │   ├── satellite-status/        # Estado constelacion GOES
│   │   ├── documentation/           # Documentacion GOES-R
│   │   ├── aurora/                  # Forecast aurora N+S
│   │   ├── solar-wind/              # Modelo WSA-ENLIL
│   │   ├── solar-synoptic/          # Mapa sinoptico solar
│   │   ├── noaa-scales/             # Escalas G/R/S en vivo
│   │   ├── space-weather/           # Articulos educativos
│   │   ├── forecast/                # Prediccion Kp LSTM
│   │   ├── comparison/              # Comparacion de instrumentos
│   │   ├── inpres-earthquakes/      # Monitor sismico
│   │   └── instruments/
│   │       ├── magnetometer/
│   │       ├── xray-flux/
│   │       ├── electron-flux/
│   │       ├── proton-flux/
│   │       ├── kp-index/
│   │       ├── dscovr/
│   │       ├── suvi/
│   │       ├── coronagraph/
│   │       ├── satellite-environment/
│   │       ├── solar-cycle/
│   │       ├── aurora-3d/
│   │       ├── magnetosphere/
│   │       ├── ctipe/
│   │       ├── wam-ipe/
│   │       ├── d-rap/
│   │       ├── glotec/
│   │       ├── swfo-l1/
│   │       └── geo-mag-perturbations/
│   │
│   └── api/                         # 42 API route handlers
│       ├── swpc/                    # 22 endpoints NOAA/SWPC
│       │   ├── alerts/
│       │   ├── aurora/
│       │   ├── aurora-ovation/
│       │   ├── coronagraph/
│       │   ├── ctipe/
│       │   ├── d-rap/
│       │   ├── dscovr-mag/
│       │   ├── electron-flux/
│       │   ├── geo-mag-perturbations/
│       │   ├── glotec/
│       │   ├── kp-index/
│       │   ├── magnetometer/
│       │   ├── magnetosphere/
│       │   ├── noaa-scales/
│       │   ├── proton-flux/
│       │   ├── solar-cycle/
│       │   ├── solar-synoptic/
│       │   ├── solar-wind/
│       │   ├── solar-wind-plasma/
│       │   ├── solar-wind-speed/
│       │   ├── suvi/
│       │   ├── wam-ipe/
│       │   └── xray-flux/
│       ├── goes/                    # 4 endpoints GOES-19
│       │   ├── imagery/
│       │   ├── imagery-list/
│       │   ├── img-proxy/
│       │   └── status/
│       ├── forecast/                # Prediccion LSTM
│       │   ├── alerts/
│       │   └── kp-prediction/
│       ├── nasa/                    # NASA APIs
│       │   ├── donki/
│       │   └── precipitation/
│       ├── push/                    # Web Push
│       │   ├── subscribe/
│       │   ├── send/
│       │   └── vapid-key/
│       ├── smn/                     # SMN Argentina
│       │   ├── alerts/
│       │   ├── alert-map/
│       │   └── weather/
│       ├── inpres/                  # INPRES sismos
│       ├── geo/                     # GeoJSON
│       ├── docs/                    # Proxy documentos
│       └── metrics/                 # Metricas internas
│
├── components/
│   ├── instruments/                 # 22 clientes de instrumentos
│   ├── animation/                   # Canvas-based image players
│   ├── charts/                      # PlotlyChart wrapper
│   ├── dashboard/                   # DashboardClient
│   ├── forecast/                    # ForecastDashboard
│   ├── imagery/                     # ImageryClient (ABI player)
│   ├── layout/                      # AppShell, TopBar, SpaceWeatherBar
│   ├── navigation/                  # Sidebar
│   ├── pwa/                         # ServiceWorkerRegistration
│   ├── space-weather/               # Articulos educativos
│   ├── satellite-status/            # SatelliteStatusClient
│   ├── smn-alerts/                  # SMNAlertsMap
│   ├── inpres/                      # InpresEarthquakesClient
│   ├── analysis/                    # ComparisonClient
│   └── ui/                          # Componentes UI compartidos
│
├── hooks/
│   ├── useAutoRefresh.ts            # TanStack Query polling wrapper
│   ├── useAnimationPlayer.ts        # Canvas animation loop
│   ├── useClocks.ts                 # UTC + local clocks (1s interval)
│   ├── useNotificationManager.ts   # Push notification state
│   ├── useQueryString.ts            # URL query params
│   └── useWeatherQuery.ts           # Weather data query
│
├── lib/
│   ├── swpc-api.ts                  # Constantes URL + fetch helpers SWPC
│   ├── goes-imagery.ts              # Constructores de URL ABI
│   ├── forecast-api.ts              # Cliente del microservicio Python
│   ├── instrumented-fetch.ts        # fetch con registro de metricas
│   ├── logger.ts                    # Logger JSON estructurado
│   ├── metrics-store.ts             # Buffer circular de metricas en proceso
│   ├── schemas.ts                   # Esquemas Zod de validacion
│   ├── thresholds.ts                # Umbrales de alerta NOAA
│   ├── space-weather-content.ts     # Contenido educativo (articulos)
│   └── utils.ts                     # cn(), formatUTC(), formatFlux(), etc.
│
├── stores/
│   ├── uiStore.ts                   # Sidebar, tema, preferencias UI (persist)
│   ├── animationStore.ts            # Estado del player (velocidad, frame, loop)
│   └── notificationStore.ts         # Suscripciones push y preferencias
│
└── types/
    ├── swpc.ts                      # FluxReading, KpReading, AlertItem, etc.
    ├── goes.ts                      # AbiBand, AbiSector, InstrumentType
    ├── forecast.ts                  # KpPrediction, ForecastResponse
    ├── animation.ts                 # AnimationState, PlayerConfig
    ├── ui.ts                        # NavItem, AlertLevel, ClockState
    └── plotly.d.ts                  # Declaraciones de tipos Plotly
```

---

## Componentes de visualizacion

### Plotly Charts

`src/components/charts/PlotlyChart.tsx` — wrapper sobre Plotly.js con:
- Tema oscuro consistente con el design system
- Responsive por defecto
- Tooltips y zoom habilitados
- Carga dinamica (no SSR) para evitar errores de hidratacion

### Canvas Animation Player

`src/components/animation/AnimationPlayer.tsx` — reproductor de secuencias de imagenes:
- Usa Canvas 2D API para renderizar frames
- Loop configurable (velocidad, play/pause, frame individual)
- Soporte para multiples fuentes (ABI, SUVI, Coronagraph, Aurora)
- Estado gestionado por `animationStore` (Zustand)

### Three.js 3D

- `AuroraGlobe3D.tsx` — globo terrestre 3D con franjas aurorales superpuestas
- `Magnetosphere3D.tsx` — visualizacion 3D de la magnetosfera

### MapLibre GL

- `SMNAlertsMap.tsx` — mapa de alertas meteorologicas SMN Argentina
- Mapa de aurora integrado con capas WMS de NowCOAST

---

## Logging y observabilidad

### Logger JSON estructurado

`src/lib/logger.ts` — logger minimalista sin dependencias externas:

```typescript
logger.info('API request', { route: 'swpc/kp-index', duration: 234 })
logger.warn('Upstream error', { status: 502, url: NOAA_URL })
logger.error('Unhandled exception', { err })
```

Salida en JSON con campos: `level`, `msg`, `timestamp`, `...context`.

### Metricas en proceso

`src/lib/metrics-store.ts` — buffer circular en memoria:
- Contadores de requests por ruta
- Latencia P50/P95
- Tasa de errores

Accesible via `GET /api/metrics` (requiere `METRICS_SECRET`).

### Sentry

Configurado en `sentry.client.config.ts`, `sentry.server.config.ts` y `sentry.edge.config.ts`. Captura:
- Excepciones no manejadas cliente y servidor
- Performance traces de API routes
- Session replay (configurable)

---

## PWA y notificaciones push

### Service Worker

`src/components/pwa/ServiceWorkerRegistration.tsx` registra el SW automaticamente al cargar la app.

El SW cachea assets estaticos y permite funcionamiento offline parcial.

### Web Push

Flujo completo:
1. Usuario hace click en "Activar alertas"
2. `useNotificationManager` pide permiso al browser
3. Se suscribe a `POST /api/push/subscribe` con la clave VAPID publica
4. La suscripcion se guarda en el store
5. Cuando llega una alerta G2+, el servidor llama a `POST /api/push/send`
6. El service worker muestra la notificacion nativa

---

## Sistema de diseno

El tema dark space se define en `tailwind.config.ts`:

```javascript
colors: {
  background: '#060a12',      // Fondo principal
  surface: '#0d1421',         // Cards y paneles
  border: '#1e2d45',          // Bordes
  'text-primary': '#e2e8f0',
  'text-secondary': '#8892a4',
  // Escala de alertas NOAA
  g1: '#22c55e', g2: '#84cc16', g3: '#eab308',
  g4: '#f97316', g5: '#ef4444',
}

fontFamily: {
  display: ['Orbitron'],       // Titulos y valores de alerta
  mono: ['Space Mono'],        // Textos de interfaz
  data: ['JetBrains Mono'],    // Valores numericos y datos
}
```

Clases de utilidad especiales:
- `shadow-glow-blue` / `shadow-glow-cyan` / `shadow-glow-red` — efectos de resplandor
- `font-display` / `font-data` — fuentes especializadas
- `text-g1` ... `text-g5` — colores de nivel de alerta NOAA

---

## Agregar un nuevo instrumento

### Paso 1: Tipos

En `src/types/swpc.ts`:

```typescript
export interface NuevoInstrumentoReading {
  time_tag: string
  value: number
  // ...
}
```

### Paso 2: API proxy

`src/app/api/swpc/nuevo-instrumento/route.ts`:

```typescript
import { NextResponse } from 'next/server'

const URL = `${process.env.NEXT_PUBLIC_SWPC_SERVICES}/json/nuevo.json`

export async function GET() {
  const res = await fetch(URL, { next: { revalidate: 60 } })
  const data = await res.json()
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=55, s-maxage=60',
      'X-Data-Source': 'NOAA/SWPC',
      'X-Last-Fetched': new Date().toISOString(),
    }
  })
}
```

### Paso 3: Componente cliente

`src/components/instruments/NuevoInstrumentoClient.tsx`:

```typescript
'use client'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { PlotlyChart } from '@/components/charts/PlotlyChart'

export function NuevoInstrumentoClient() {
  const { data, isLoading, error } = useAutoRefresh<NuevoInstrumentoReading[]>(
    '/api/swpc/nuevo-instrumento',
    60_000  // 1 min
  )

  if (isLoading) return <Skeleton />
  if (error) return <WidgetError />

  return <PlotlyChart data={...} layout={...} />
}
```

### Paso 4: Pagina

`src/app/(dashboard)/instruments/nuevo-instrumento/page.tsx`:

```typescript
import { NuevoInstrumentoClient } from '@/components/instruments/NuevoInstrumentoClient'

export default function NuevoInstrumentoPage() {
  return (
    <div>
      <h1>Nuevo Instrumento</h1>
      <NuevoInstrumentoClient />
    </div>
  )
}
```

### Paso 5: Sidebar

Agregar la entrada en `src/components/navigation/Sidebar.tsx` en el array de items de navegacion.
