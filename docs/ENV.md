# Variables de entorno — GOES-19 Space Weather Monitor

Copia `.env.local.example` a `.env.local` y completa los valores necesarios.
`.env.local` esta en `.gitignore` — **nunca lo subas al repositorio**.

```bash
cp .env.local.example .env.local
```

---

## Identidad de la app

| Variable | Valor por defecto | Descripcion |
|----------|-------------------|-------------|
| `NEXT_PUBLIC_APP_NAME` | `GOES-19 Space Weather` | Nombre mostrado en UI y metadatos |
| `NEXT_PUBLIC_APP_VERSION` | `0.1.0` | Version mostrada en el footer |

---

## APIs de datos espaciales (NOAA/SWPC)

Estas URLs apuntan a APIs publicas de NOAA. No requieren API key. Se incluyen como variables de entorno para facilitar el desarrollo contra ambientes de staging o mirrors.

| Variable | URL por defecto | Descripcion |
|----------|-----------------|-------------|
| `NEXT_PUBLIC_SWPC_SERVICES` | `https://services.swpc.noaa.gov` | API principal SWPC — flujo de particulas, magnetometro, Kp, rayos X, etc. |
| `NEXT_PUBLIC_SWPC_WWW` | `https://www.swpc.noaa.gov` | Sitio web SWPC — modelos, animaciones, coronografo |
| `NEXT_PUBLIC_GOES19_CDN` | `https://cdn.star.nesdis.noaa.gov/GOES19/ABI` | CDN de imagenes ABI del satelite GOES-19 |
| `NEXT_PUBLIC_STAR_BASE` | `https://www.star.nesdis.noaa.gov` | Visor de imagenes STAR — animaciones y links externos |
| `NEXT_PUBLIC_OSPO_STATUS` | `https://www.ospo.noaa.gov` | Estado operacional de la constelacion GOES |
| `NEXT_PUBLIC_NOAA_NOWCOAST` | `https://nowcoast.noaa.gov` | Capas WMS rayos GLM y productos en tiempo real |

---

## APIs meteorologicas y geograficas

| Variable | URL por defecto | Descripcion |
|----------|-----------------|-------------|
| `NEXT_PUBLIC_OPEN_METEO_API` | `https://api.open-meteo.com/v1` | Datos meteorologicos locales (temperatura, viento, humedad). Sin API key. |
| `NEXT_PUBLIC_NASA_POWER_API` | `https://power.larc.nasa.gov/api` | Precipitacion historica por coordenadas (reanálisis MERRA-2). Sin API key. |
| `NEXT_PUBLIC_BIGDATACLOUD_API` | `https://api.bigdatacloud.net/data/reverse-geocode-client` | Geocodificacion inversa (lat/lon → nombre de ciudad). Sin API key. |

---

## NASA API Key

| Variable | Requerida | Descripcion |
|----------|-----------|-------------|
| `NASA_API_KEY` | Opcional | Usada en `/api/nasa/donki` para el Monitor de Anomalias Satelitales (NASA DONKI). Sin esta key se usa `DEMO_KEY` con limite de **30 req/hora y 50/dia**. Con tu key gratuita: **1.000 req/hora**. |

Obtener tu key gratuita en: [https://api.nasa.gov/](https://api.nasa.gov/)

---

## Feature Flags

Permiten activar o desactivar secciones experimentales de la UI sin cambiar codigo.

| Variable | Default | Descripcion |
|----------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_AURORA_MAP` | `true` | Activa el mapa de aurora borealis |
| `NEXT_PUBLIC_ENABLE_SOLAR_WIND` | `true` | Activa la animacion del modelo WSA-ENLIL |
| `NEXT_PUBLIC_ENABLE_CORONAGRAPH` | `true` | Activa las imagenes de coronografo |

---

## Sentry (monitoreo de errores)

| Variable | Requerida | Descripcion |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Opcional | DSN del proyecto Sentry para captura de errores en cliente y servidor. Crear en: sentry.io → Settings → Client Keys → DSN. |
| `SENTRY_AUTH_TOKEN` | Opcional | Token para upload de sourcemaps en CI/CD. Obtener en: sentry.io → Settings → Auth Tokens. Formato: `sntrys_...` |

Sin `NEXT_PUBLIC_SENTRY_DSN`, Sentry esta deshabilitado y no reporta errores.

---

## Web Push / VAPID (notificaciones push)

| Variable | Requerida | Descripcion |
|----------|-----------|-------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Para push | Clave publica VAPID. Se envia al browser para verificar el origen de las notificaciones. |
| `VAPID_PRIVATE_KEY` | Para push | Clave privada VAPID. **Nunca expongas esta variable al cliente.** |
| `VAPID_EMAIL` | Para push | Email de contacto requerido por el protocolo Web Push. |

### Generar claves VAPID

```bash
# Con Node.js
node -e "require('web-push').generateVAPIDKeys().then(k => console.log(JSON.stringify(k, null, 2)))"

# O con npx
npx web-push generate-vapid-keys
```

Resultado:
```json
{
  "publicKey": "BPH...",
  "privateKey": "64E..."
}
```

> Las claves VAPID se generan **una sola vez** y no deben cambiar. Si cambian, todos los usuarios suscritos dejan de recibir notificaciones y deben re-suscribirse.

---

## Metricas internas

| Variable | Requerida | Descripcion |
|----------|-----------|-------------|
| `METRICS_SECRET` | Recomendado en produccion | Token para acceder a `GET /api/metrics`. Sin este token, el endpoint devuelve 401. En desarrollo puede omitirse. |

### Generar un METRICS_SECRET

```bash
openssl rand -hex 32
```

### Usar el endpoint

```bash
curl https://tu-app.vercel.app/api/metrics \
  -H "Authorization: Bearer TU_METRICS_SECRET"
```

---

## Servicio de prediccion IA (LSTM)

| Variable | Requerida | Descripcion |
|----------|-----------|-------------|
| `FORECAST_SERVICE_URL` | Opcional | URL del microservicio Python FastAPI deployado. Sin slash al final. Si no se configura, el sistema usa el Modelo Base (basado en reglas) automaticamente. |
| `FORECAST_MODEL_VERSION` | Opcional | Version del modelo mostrada en la UI. Sobreescribe la version reportada por el servicio Python. |

### Ejemplo de configuracion

```bash
# Railway deployment
FORECAST_SERVICE_URL="https://space-weather-forecast.up.railway.app"
FORECAST_MODEL_VERSION="1.0"

# Local development
FORECAST_SERVICE_URL="http://localhost:8000"
```

### Comportamiento sin FORECAST_SERVICE_URL

Si la variable no esta configurada:
- `/api/forecast/kp-prediction` responde 503 con `{ available: false }`
- El dashboard de prediccion muestra el modelo basado en reglas automaticamente
- No hay errores ni interrupciones en el resto de la app

---

## Resumen rapido para desarrollo local

El `.env.local.example` ya tiene todos los valores necesarios para desarrollo. Solo cambiar:

1. **`NASA_API_KEY`** — opcional pero recomendado para evitar rate limits
2. **`FORECAST_SERVICE_URL`** — agregar si vas a correr el microservicio Python localmente

El resto puede dejarse con los valores por defecto del ejemplo.
