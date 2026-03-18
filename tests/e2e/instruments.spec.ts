/**
 * Instrument pages tests
 * Verifica que los instrumentos cargan datos mockeados y muestran
 * el gráfico (Plotly). También testea selectores de rango temporal.
 */
import { test, expect } from '@playwright/test'
import { mockApis } from './helpers/mock-api'

// ─── Magnetómetro GOES ────────────────────────────────────────────────────────

test.describe('Magnetómetro GOES', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { magnetometer: true })
  })

  test('página carga y muestra el heading', async ({ page }) => {
    await page.goto('/instruments/magnetometer')
    await expect(page.getByRole('heading', { name: /magnetómetro/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('gráfico Plotly renderiza', async ({ page }) => {
    await page.goto('/instruments/magnetometer')
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 15_000 })
  })

  test('selector de rango temporal está visible', async ({ page }) => {
    await page.goto('/instruments/magnetometer')
    // TimeRangeSelector usa botones o tabs con texto como "1h", "6h", "1d"
    const rangeSelector = page.locator('[data-testid="time-range-selector"], button').filter({ hasText: /1h|6h|1d/i })
    await expect(rangeSelector.first()).toBeVisible({ timeout: 10_000 })
  })

  test('no muestra error de carga con datos válidos', async ({ page }) => {
    await page.goto('/instruments/magnetometer')
    await expect(page.getByText(/error al cargar|failed to fetch/i)).not.toBeVisible({ timeout: 10_000 })
  })
})

// ─── Índice Kp ───────────────────────────────────────────────────────────────

test.describe('Índice Planetario Kp', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { kpIndex: true })
  })

  test('página carga y muestra el heading', async ({ page }) => {
    await page.goto('/instruments/kp-index')
    await expect(page.getByRole('heading', { name: /kp|planetario/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('gráfico Plotly renderiza', async ({ page }) => {
    await page.goto('/instruments/kp-index')
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 15_000 })
  })
})

// ─── Flujo X-Ray ─────────────────────────────────────────────────────────────

test.describe('Flujo X-Ray', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { xrayFlux: true })
  })

  test('página carga y muestra el heading', async ({ page }) => {
    await page.goto('/instruments/xray-flux')
    await expect(page.getByRole('heading', { name: /x.?ray|rayos.?x/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('gráfico Plotly renderiza', async ({ page }) => {
    await page.goto('/instruments/xray-flux')
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 15_000 })
  })
})

// ─── Flujo de Electrones ──────────────────────────────────────────────────────

test.describe('Flujo de Electrones', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { electronFlux: true })
  })

  test('página carga con heading', async ({ page }) => {
    await page.goto('/instruments/electron-flux')
    await expect(page.getByRole('heading', { name: /electron/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('gráfico Plotly renderiza', async ({ page }) => {
    await page.goto('/instruments/electron-flux')
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 15_000 })
  })
})

// ─── Flujo de Protones ───────────────────────────────────────────────────────

test.describe('Flujo de Protones', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { protonFlux: true })
  })

  test('página carga con heading', async ({ page }) => {
    await page.goto('/instruments/proton-flux')
    await expect(page.getByRole('heading', { name: /prot[oó]n/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('gráfico Plotly renderiza', async ({ page }) => {
    await page.goto('/instruments/proton-flux')
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 15_000 })
  })
})

// ─── DSCOVR Magnetómetro ─────────────────────────────────────────────────────

test.describe('DSCOVR Magnetómetro (IMF L1)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { dscovrMag: true })
  })

  test('página carga con heading', async ({ page }) => {
    await page.goto('/instruments/dscovr')
    await expect(page.getByRole('heading', { name: /dscovr|imf|interplanetario/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('gráfico Plotly renderiza', async ({ page }) => {
    await page.goto('/instruments/dscovr')
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 15_000 })
  })
})

// ─── Estado del Satélite ─────────────────────────────────────────────────────

test.describe('Estado del Satélite GOES', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { goesStatus: true })
  })

  test('página carga con heading', async ({ page }) => {
    await page.goto('/satellite-status')
    await expect(page.getByRole('heading', { name: /satélite|satellite/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('muestra al menos un satélite de la fixture', async ({ page }) => {
    await page.goto('/satellite-status')
    // El fixture incluye GOES-19
    await expect(page.getByText(/GOES/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
