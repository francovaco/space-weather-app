# Deployment y Plataformas — GOES-19 Space Weather Monitor

## Arquitectura de produccion

```
┌──────────────────────────┐      ┌──────────────────────────┐
│   Vercel (Frontend)      │ ───► │   Railway (Python API)   │
│   Next.js 14             │      │   FastAPI + ONNX Runtime  │
│   CDN global             │      │   Docker ~400 MB          │
└──────────────────────────┘      └──────────────────────────┘
         │                                    │
         ▼                                    ▼
┌──────────────────────────────────────────────────────────┐
│              Servicios de observabilidad                  │
│   Sentry (errores)   ·   Microsoft Clarity (analytics)   │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│              APIs externas (sin deployment propio)        │
│   NOAA/SWPC   ·   GOES-19   ·   NASA   ·   GFZ Potsdam   │
└──────────────────────────────────────────────────────────┘
```

---

## Vercel — Frontend Next.js

[vercel.com](https://vercel.com) es la plataforma oficial de deployment de Next.js. Provee CDN global, SSL automatico, preview deployments por PR y zero-config para proyectos Next.js.

### Crear cuenta y proyecto

1. Ir a [vercel.com](https://vercel.com) → **Sign Up** con tu cuenta GitHub
2. Click en **Add New Project**
3. Importar el repositorio de GitHub
4. Vercel detecta automaticamente que es un proyecto Next.js — no hay nada que configurar en el build

### Configurar variables de entorno

Antes del primer deploy, ir a **Settings → Environment Variables** y agregar:

**Publicas (cliente + servidor):**
```
NEXT_PUBLIC_APP_NAME             = GOES-19 Space Weather
NEXT_PUBLIC_APP_VERSION          = 0.1.0
NEXT_PUBLIC_SWPC_SERVICES        = https://services.swpc.noaa.gov
NEXT_PUBLIC_SWPC_WWW             = https://www.swpc.noaa.gov
NEXT_PUBLIC_GOES19_CDN           = https://cdn.star.nesdis.noaa.gov/GOES19/ABI
NEXT_PUBLIC_STAR_BASE            = https://www.star.nesdis.noaa.gov
NEXT_PUBLIC_OSPO_STATUS          = https://www.ospo.noaa.gov
NEXT_PUBLIC_NOAA_NOWCOAST        = https://nowcoast.noaa.gov
NEXT_PUBLIC_OPEN_METEO_API       = https://api.open-meteo.com/v1
NEXT_PUBLIC_NASA_POWER_API       = https://power.larc.nasa.gov/api
NEXT_PUBLIC_BIGDATACLOUD_API     = https://api.bigdatacloud.net/data/reverse-geocode-client
NEXT_PUBLIC_ENABLE_AURORA_MAP    = true
NEXT_PUBLIC_ENABLE_SOLAR_WIND    = true
NEXT_PUBLIC_ENABLE_CORONAGRAPH   = true
NEXT_PUBLIC_SENTRY_DSN           = https://...@sentry.io/...
NEXT_PUBLIC_VAPID_PUBLIC_KEY     = BPH...
```

**Privadas (solo servidor — NO tienen prefijo NEXT_PUBLIC_):**
```
NASA_API_KEY           = tu-key
METRICS_SECRET         = tu-hex-32-chars
SENTRY_AUTH_TOKEN      = sntrys_...
VAPID_PRIVATE_KEY      = 64E...
VAPID_EMAIL            = tu@email.com
FORECAST_SERVICE_URL   = https://tu-servicio.up.railway.app
FORECAST_MODEL_VERSION = 1.0
```

> En Vercel, las variables privadas (sin `NEXT_PUBLIC_`) solo son accesibles en el servidor. Nunca se exponen al browser.

### Deploy

Con el repositorio conectado, Vercel hace deploy automatico en cada push a `main`. Para deploy manual:

```bash
# Instalar CLI
npm i -g vercel

# Login
vercel login

# Deploy a produccion
vercel --prod
```

### Preview deployments

Vercel crea una URL de preview unica para cada Pull Request. Util para revisar cambios antes de mergear. La URL tiene el formato `nombre-proyecto-git-rama.vercel.app`.

### Dominio personalizado

**Settings → Domains** → agregar tu dominio. Vercel genera automaticamente el certificado SSL (Let's Encrypt).

### Ver logs en produccion

```bash
# Logs en tiempo real del deployment mas reciente
vercel logs tu-proyecto.vercel.app

# O desde el dashboard: Deployments → [deployment] → Functions
```

### Rollback

Si algo falla, desde el panel de Vercel: **Deployments** → elegir un deployment anterior → **Promote to Production**.

---

## Railway — Microservicio Python

[railway.app](https://railway.app) es la plataforma para el microservicio FastAPI con el modelo LSTM. Corre el contenedor Docker y expone un endpoint HTTPS publico.

### Crear cuenta y proyecto

1. Ir a [railway.app](https://railway.app) → **Login with GitHub**
2. Click en **New Project** → **Deploy from GitHub repo**
3. Seleccionar el repositorio
4. Railway detecta el `Dockerfile` en `forecast-service/`

### Configurar el root directory

Railway necesita saber que el servicio esta en un subdirectorio:

1. Ir al servicio → **Settings**
2. En **Root Directory** escribir: `forecast-service`
3. Railway usara ese directorio como contexto del build Docker

### Asegurarse de que el modelo este incluido

El directorio `weights/` con `kp_lstm.onnx` y `norms.json` debe existir antes del deploy. Railway copia todo el contenido del directorio raiz del servicio dentro del contenedor.

Si los archivos del modelo no estan en el repositorio (por `.gitignore`), hay dos opciones:

**Opcion A**: Entrenar localmente y subir los weights al repo (recomendado si el modelo es estable)

**Opcion B**: Hacer que el contenedor entrene al arrancar — mas complejo, no recomendado para Railway free tier.

### Variables de entorno en Railway

Por defecto el servicio no necesita variables extra. Si queres restringir CORS a tu dominio de Vercel:

1. Ir al servicio → **Variables**
2. Agregar: `ALLOWED_ORIGINS = https://tu-app.vercel.app`

Railway expone automaticamente la variable `PORT` — el CMD del Dockerfile ya usa `--port 8000` que Railway mapea correctamente.

### Ver la URL publica

1. Ir al servicio → **Settings** → **Networking**
2. Click en **Generate Domain** si no tiene uno
3. La URL sera algo como `space-weather-xxxx.up.railway.app`

### Copiar la URL al frontend

Pegar la URL en la variable de entorno de Vercel:
```
FORECAST_SERVICE_URL = https://space-weather-xxxx.up.railway.app
```

### Verificar que funciona

```bash
curl https://tu-servicio.up.railway.app/health
# {"status":"ok","model_loaded":true}

curl https://tu-servicio.up.railway.app/predict
# {"available":true,"predictions":[{"horizon_hours":1,"predicted_kp":2.3,...},...]}
```

### Ver logs en Railway

Desde el panel del servicio → **Deployments** → click en el deployment activo → **View Logs**.

O con CLI:

```bash
npm i -g @railway/cli
railway login
railway logs
```

### Costos

Railway free tier incluye $5/mes de credito. El microservicio en idle usa muy poca memoria — deberia mantenerse dentro del free tier en la mayoria de los casos.

---

## Sentry — Monitoreo de errores

[sentry.io](https://sentry.io) captura excepciones, errores de API y performance traces en tiempo real. Esta integrado en los tres entornos de Next.js: cliente (browser), servidor (Node.js) y Edge Runtime.

### Crear cuenta y proyecto

1. Ir a [sentry.io](https://sentry.io) → **Sign Up** (gratis hasta 5.000 errores/mes)
2. **Create Project** → seleccionar **Next.js**
3. Copiar el **DSN** que aparece en la pantalla de configuracion

### Como esta configurado en el codigo

La integracion usa tres archivos que Next.js carga automaticamente:

**`sentry.client.config.ts`** — SDK del browser:
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,          // 10% de requests trackeados
  replaysSessionSampleRate: 0.1,  // 10% de sesiones grabadas
  replaysOnErrorSampleRate: 1.0,  // 100% de sesiones con error
  integrations: [Sentry.replayIntegration()],
})
```

**`sentry.server.config.ts`** — SDK del servidor Node.js:
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
})
```

**`sentry.edge.config.ts`** — SDK del Edge Runtime (middleware, Edge API Routes):
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
})
```

El `next.config.mjs` envuelve la config de Next.js con `withSentryConfig` que:
- Sube sourcemaps al build (requiere `SENTRY_AUTH_TOKEN`)
- Habilita el instrumentation hook para el servidor
- Silencia output de CLI cuando no hay DSN configurado

### Configurar las variables de entorno

En Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_SENTRY_DSN = https://abc123@o123456.ingest.sentry.io/789
SENTRY_AUTH_TOKEN      = sntrys_...
```

El `SENTRY_AUTH_TOKEN` es necesario para que Sentry reciba los sourcemaps durante el build de Vercel. Sin el, los stack traces en el panel de Sentry muestran codigo minificado (aun asi captura el error, pero es mas dificil leer).

Para obtener el token: Sentry → **Settings → Auth Tokens → Create New Token** con scope `project:releases` y `org:read`.

### Navegar el panel de Sentry

- **Issues** — lista de todos los errores capturados, agrupados por tipo
- **Performance** — latencia de API routes, Core Web Vitals
- **Replays** — grabaciones de sesiones donde hubo errores
- **Alerts** — configurar notificaciones por email/Slack cuando aparece un error nuevo

### Configurar alertas

Sentry → **Alerts → Create Alert Rule**:

- Condicion: `Number of errors > 0` en los ultimos 5 minutos
- Accion: notificar por email o Slack
- Filtrar por entorno: `production`

### Ajustar el sample rate

En produccion con poco trafico, se puede subir el `tracesSampleRate` a `1.0` (100%) para no perder ninguna traza. Con trafico alto, bajarlo a `0.01` para no exceder la cuota.

Editar `sentry.client.config.ts` y `sentry.server.config.ts`.

---

## Microsoft Clarity — Analytics de comportamiento

[clarity.microsoft.com](https://clarity.microsoft.com) es una herramienta gratuita de analytics que graba sesiones de usuario, genera heatmaps de clicks y scroll, e identifica rage clicks y dead clicks. No hay limite de sesiones ni de datos.

### Como esta integrado

El script de Clarity esta embebido directamente en `src/app/layout.tsx`:

```tsx
<Script
  id="microsoft-clarity"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: `(function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window,document,"clarity","script","vx97z7u07u");`,
  }}
/>
```

El ID del proyecto (`vx97z7u07u`) esta hardcodeado. Es publico — no hay problema en tenerlo en el codigo.

### Crear cuenta y proyecto

1. Ir a [clarity.microsoft.com](https://clarity.microsoft.com) → **Sign in** con cuenta Microsoft o Google
2. **Create New Project** → ingresar el nombre y la URL del sitio
3. Clarity genera un snippet con el ID del proyecto
4. El snippet ya esta instalado — si queres cambiar el proyecto, reemplazar el ID `vx97z7u07u` en `layout.tsx`

### Que se puede ver en Clarity

- **Dashboard** — sesiones activas, duracion promedio, bounce rate, pages mas visitadas
- **Recordings** — grabaciones de sesiones individuales con el mouse y clicks del usuario
- **Heatmaps** — mapa de calor de clicks, scroll depth y areas de atencion por pagina
- **Insights** — rage clicks (usuario frustrando haciendo click repetidamente), dead clicks (clicks en elementos no interactivos), excessive scrolling

### Filtrar por pagina

En Clarity → **Recordings** → usar el filtro **URL** para ver sesiones solo de `/instruments/magnetometer` o cualquier otra ruta especifica.

### Privacidad

Clarity tiene **masking automatico** de texto sensible (inputs de password, etc.). Para el dashboard de clima espacial no hay datos sensibles, pero si se agregan formularios de login en el futuro, Clarity los enmascara automaticamente.

No requiere ningun cambio en el codigo para funcionar — el script ya esta activo en todos los entornos.

---

## Checklist completo de deployment

### Antes del primer deploy

- [ ] Modelo LSTM entrenado: `forecast-service/weights/kp_lstm.onnx` existe
- [ ] `pnpm build` termina sin errores
- [ ] `pnpm type-check` sin errores TypeScript
- [ ] `pnpm test:e2e` todos los tests pasan

### Configurar Sentry

- [ ] Crear proyecto en sentry.io
- [ ] Copiar DSN
- [ ] Crear Auth Token con scope `project:releases`
- [ ] Agregar `NEXT_PUBLIC_SENTRY_DSN` y `SENTRY_AUTH_TOKEN` en Vercel

### Configurar Railway

- [ ] Crear proyecto apuntando a `forecast-service/`
- [ ] Verificar que `weights/kp_lstm.onnx` esta en el directorio
- [ ] Obtener la URL publica del servicio

### Configurar Vercel

- [ ] Importar repositorio
- [ ] Agregar todas las variables de entorno (ver lista arriba)
- [ ] Agregar `FORECAST_SERVICE_URL` con la URL de Railway
- [ ] Deploy inicial completado
- [ ] Verificar `/api/forecast/kp-prediction` responde `available: true`

### Configurar Clarity (opcional)

- [ ] Crear proyecto en clarity.microsoft.com
- [ ] Si es un proyecto nuevo: reemplazar el ID en `layout.tsx`
- [ ] Si es el mismo proyecto ya configurado: no hacer nada

### Verificacion post-deploy

```bash
# Frontend carga
curl -I https://tu-app.vercel.app

# Microservicio responde
curl https://tu-servicio.up.railway.app/health

# API route de prediccion funciona
curl https://tu-app.vercel.app/api/forecast/kp-prediction

# API de datos NOAA proxeada correctamente
curl https://tu-app.vercel.app/api/swpc/kp-index
```

---

## Troubleshooting

### Build de Vercel falla con error de Sentry

Si el build falla con un error relacionado a Sentry sourcemaps:

- Verificar que `SENTRY_AUTH_TOKEN` este configurado correctamente en Vercel
- Si no queres sourcemaps en Sentry, el build igual funciona — solo no tendra stack traces legibles

### Railway: modelo no encontrado (`model_loaded: false`)

El servicio arranca pero responde `model_loaded: false` en `/health`:

- Los archivos `kp_lstm.onnx` y `norms.json` no estan en `forecast-service/weights/`
- Verificar que el directorio `weights/` esta incluido en el build (no en `.dockerignore`)
- Entrenar el modelo localmente y hacer commit de los archivos weights

### FORECAST_SERVICE_URL devuelve 503

El frontend muestra el modelo de reglas en lugar del LSTM:

- Verificar que `FORECAST_SERVICE_URL` en Vercel no tiene slash al final
- Verificar que Railway no puso el servicio en sleep (free tier duerme despues de inactividad)
- El primer request despues de que Railway despierta el contenedor puede tardar 5-10 segundos

### Clarity no aparece en recordings

- Puede tardar hasta 2 horas para que aparezcan las primeras grabaciones
- Verificar en el browser que el script se carga: abrir DevTools → Network → filtrar por `clarity.ms`
- Si hay un Content Security Policy (CSP) configurado, agregar `www.clarity.ms` a la whitelist
