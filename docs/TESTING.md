# Guia de Testing — GOES-19 Space Weather Monitor

## Overview

El proyecto usa **Playwright** para tests End-to-End (E2E). Los tests arrancan el servidor de desarrollo Next.js automaticamente, mockean las APIs externas de NOAA/SWPC, y verifican el comportamiento de la aplicacion desde la perspectiva del usuario.

No hay tests unitarios ni de integracion separados — la estrategia apunta directamente a E2E ya que el valor principal esta en la integracion entre el cliente, las API routes y los datos externos.

---

## Stack de testing

| Herramienta | Version | Uso |
|-------------|---------|-----|
| Playwright | 1.58+ | Test runner E2E multi-browser |
| Chromium | bundled | Browser principal |
| Mobile Chrome (Pixel 5) | bundled | Tests responsive |

---

## Requisitos

```bash
# Instalar browsers de Playwright
pnpm dlx playwright install chromium

# O todos los browsers
pnpm dlx playwright install
```

---

## Comandos

```bash
# Correr todos los tests (headless, paralelo)
pnpm test:e2e

# Con interfaz grafica interactiva (recomendado para desarrollo)
pnpm test:e2e:ui

# Con ventana de browser visible
pnpm test:e2e:headed

# Solo un archivo de specs
pnpm test:e2e -- tests/e2e/api.spec.ts

# Solo tests que matcheen un nombre
pnpm test:e2e -- --grep "magnetometro"

# En modo debug (paso a paso)
pnpm test:e2e -- --debug

# Ver el reporte HTML del ultimo run
pnpm test:e2e:report
```

---

## Estructura de tests

```
tests/
└── e2e/
    ├── api.spec.ts           # Tests de API routes
    ├── navigation.spec.ts    # Tests de navegacion y routing
    ├── instruments.spec.ts   # Tests de paginas de instrumentos
    ├── layout.spec.ts        # Tests de layout y responsive
    ├── metrics.spec.ts       # Tests de metricas internas
    ├── helpers/
    │   └── mock-api.ts       # Helper para mockear APIs externas
    └── fixtures/             # Datos JSON de respuesta para mocks
        ├── alerts.json
        ├── dscovr-mag.json
        ├── electron-flux.json
        ├── goes-status.json
        ├── kp-index.json
        ├── magnetometer.json
        ├── noaa-scales.json
        ├── proton-flux.json
        └── xray-flux.json
```

---

## Descripcion de cada spec

### `api.spec.ts` — Tests de API routes

Llama directamente a los endpoints `/api/*` y valida:
- El status HTTP es aceptable (200, o 502 si NOAA esta offline)
- La estructura del JSON de respuesta es correcta
- Las validaciones de parametros funcionan (400 sin url, 403 con dominio no permitido)

**Caracteristica clave**: estos tests NO mockean nada — prueban la integracion real con el servidor Next.js. Son tolerantes a fallos upstream (aceptan 502 cuando NOAA esta caido).

```typescript
test('/api/swpc/magnetometer responde JSON', async ({ request }) => {
  const { status, body } = await apiGet(request, '/api/swpc/magnetometer?range=1-hour')
  expect([200, 422, 502, 500]).toContain(status)
  if (status === 200) {
    expect(Array.isArray(body)).toBe(true)
    if (body.length > 0) {
      expect(body[0]).toHaveProperty('time_tag')
      expect(body[0]).toHaveProperty('Hp')
    }
  }
})
```

**Tests incluidos:**
- `/api/swpc/noaa-scales` — responde 200 o 502
- `/api/swpc/alerts` — devuelve array cuando es 200
- `/api/swpc/magnetometer` — valida estructura con `time_tag`, `Hp`, `total`
- `/api/swpc/kp-index` — valida campo `kp` numerico
- `/api/swpc/xray-flux` — valida campos `flux` y `energy`
- `/api/goes/status` — valida `fetchedAt` y `satellites` array
- `/api/swpc/solar-cycle` — valida `observed` y `predicted` arrays
- `/api/goes/img-proxy` sin url → 400
- `/api/docs/proxy` sin url → 400
- `/api/docs/proxy` con dominio no permitido → 403

---

### `navigation.spec.ts` — Tests de navegacion

Verifica que el routing de Next.js y el sidebar funcionan correctamente.

**Usa mocks** de todas las APIs para no depender de NOAA en tests de UI.

```typescript
test('la URL cambia al hacer click en un enlace de navegacion', async ({ page }) => {
  await mockApis(page, { all: true })
  await page.goto('/')
  const link = page.locator('a[href="/noaa-scales"]').first()
  await link.click()
  await expect(page).toHaveURL(/noaa-scales/, { timeout: 8_000 })
})
```

**Tests incluidos:**
- Pagina principal carga sin `Application error`
- Navega a `/noaa-scales` y muestra heading
- Navega a `/space-weather` y muestra heading
- Navega a `/documentation` y muestra heading
- Navega a `/solar-synoptic` y muestra heading
- Click en enlace cambia la URL
- Navegar de instrumento a home conserva el sidebar
- Pagina de clima espacial (educativa) carga
- Articulo de aurora carga
- Articulo de impacto GPS carga

---

### `instruments.spec.ts` — Tests de instrumentos

Verifica que las paginas de cada instrumento renderizan correctamente con datos mockeados.

```typescript
test('magnetometro renderiza grafico', async ({ page }) => {
  await mockApis(page, { magnetometer: true })
  await page.goto('/instruments/magnetometer')
  await expect(page.locator('[data-testid="magnetometer-chart"]')).toBeVisible()
})
```

**Tests incluidos:**
- Pagina de magnetometro con grafico
- Pagina de rayos X con grafico
- Pagina de flujo de electrones
- Pagina de flujo de protones
- Pagina de indice Kp
- Pagina de aurora con mapa
- Dashboard principal con escalas NOAA

---

### `layout.spec.ts` — Tests de layout y responsive

Verifica el layout general y la responsividad en mobile.

**Configuracion especial**: este spec corre en dos proyectos — desktop Chromium y mobile Pixel 5 (emulado).

```typescript
test('sidebar existe en desktop', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('nav[aria-label="Sidebar"]')).toBeVisible()
})

test('topbar muestra el reloj UTC', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/UTC/)).toBeVisible()
})
```

---

### `metrics.spec.ts` — Tests de metricas

Verifica que el endpoint `/api/metrics` funciona correctamente:

```typescript
test('metricas requieren autenticacion', async ({ request }) => {
  const res = await request.get('/api/metrics')
  expect(res.status()).toBe(401)
})

test('metricas con token correcto devuelven JSON', async ({ request }) => {
  const res = await request.get('/api/metrics', {
    headers: { 'Authorization': `Bearer ${process.env.METRICS_SECRET}` }
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toHaveProperty('requests')
})
```

---

## Helper: mock-api.ts

`tests/e2e/helpers/mock-api.ts` intercepta las llamadas a las API routes y devuelve los datos de los fixtures JSON locales.

```typescript
export async function mockApis(page: Page, options: MockOptions) {
  if (options.all || options.magnetometer) {
    await page.route('/api/swpc/magnetometer*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(magnetometerFixture),
      })
    })
  }
  // ... mas mocks
}
```

**Por que mockear:**
- Las APIs de NOAA pueden estar offline o con datos inconsistentes
- Los tests deben ser deterministas y rapidos
- Los fixtures tienen estructura conocida para hacer assertions precisas

**Cuando NO mockear:**
- `api.spec.ts` no mockea — verifica la integracion real con el servidor

---

## Configuracion de Playwright

`playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile',   use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

**Notas importantes:**
- En desarrollo local, Playwright reutiliza el servidor si ya esta corriendo (`reuseExistingServer: true`)
- En CI, siempre levanta un servidor fresco
- Screenshots y videos se guardan solo en fallos
- HTML report en `playwright-report/`

---

## Correr tests en CI

El workflow de GitHub Actions (`.github/workflows/`) corre los tests en cada push:

```yaml
- name: Install dependencies
  run: pnpm install

- name: Install Playwright browsers
  run: pnpm dlx playwright install chromium

- name: Run E2E tests
  run: pnpm test:e2e
  env:
    CI: true
    NEXT_PUBLIC_SWPC_SERVICES: https://services.swpc.noaa.gov
    # ... otras vars de entorno
```

---

## Agregar nuevos tests

### Test de navegacion

```typescript
test('navega a /nuevo-instrumento', async ({ page }) => {
  await mockApis(page, { all: true })
  await page.goto('/instruments/nuevo-instrumento')
  await expect(
    page.getByRole('heading', { name: /nuevo instrumento/i }).first()
  ).toBeVisible({ timeout: 10_000 })
})
```

### Test de API route

```typescript
test('/api/swpc/nuevo-instrumento responde JSON', async ({ request }) => {
  const { status, body } = await apiGet(request, '/api/swpc/nuevo-instrumento')
  expect([200, 502, 500]).toContain(status)
  if (status === 200) {
    expect(Array.isArray(body)).toBe(true)
  }
})
```

### Agregar fixture

Crear `tests/e2e/fixtures/nuevo-instrumento.json`:

```json
[
  {
    "time_tag": "2026-03-17T12:00:00Z",
    "value": 1.23
  }
]
```

Luego agregar el mock en `helpers/mock-api.ts`.

---

## Debugging de tests fallidos

### Ver el reporte HTML

```bash
pnpm test:e2e:report
```

El reporte muestra screenshots del fallo, trazas de red y video si hay.

### Modo interactivo

```bash
pnpm test:e2e:ui
```

Permite correr tests uno a uno, ver el browser en tiempo real y inspeccionar el DOM.

### Modo paso a paso

```bash
pnpm test:e2e -- --debug tests/e2e/navigation.spec.ts
```

Abre el browser con DevTools y pausa en cada accion.

### Traces

Si un test falla en CI, bajar el artefacto `playwright-report` y abrirlo localmente con:

```bash
pnpm dlx playwright show-report ruta/al/playwright-report
```
