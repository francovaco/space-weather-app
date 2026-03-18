/**
 * Navigation tests
 * Verifica que el sidebar navega correctamente entre las páginas principales.
 */
import { test, expect } from '@playwright/test'
import { mockApis } from './helpers/mock-api'

// Páginas que no requieren datos externos para renderizar su heading
const STATIC_PAGES = [
  { path: '/noaa-scales',          heading: /escalas noaa|noaa scales/i },
  { path: '/space-weather',        heading: /clima espacial|space weather/i },
  { path: '/documentation',        heading: /documentaci/i },
  { path: '/solar-synoptic',       heading: /sinóptico|synoptic/i },
]

test.describe('Navegación entre páginas', () => {
  test('página principal carga sin errores', async ({ page }) => {
    await mockApis(page, { all: true })
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByText(/Application error/i)).not.toBeVisible()
  })

  for (const { path, heading } of STATIC_PAGES) {
    test(`navega a ${path} y muestra el heading`, async ({ page }) => {
      await mockApis(page, { all: true })
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({
        timeout: 10_000,
      })
    })
  }

  test('la URL cambia al hacer click en un enlace de navegación', async ({ page }) => {
    await mockApis(page, { all: true })
    await page.goto('/')

    // Busca el enlace a /solar-synoptic que es un item de nivel superior del sidebar
    const link = page.locator('a[href="/solar-synoptic"]').first()
    await expect(link).toBeAttached({ timeout: 8_000 })
    await link.click()

    await expect(page).toHaveURL(/solar-synoptic/, { timeout: 8_000 })
  })

  test('navegar de instrumentos de vuelta a / conserva el layout', async ({ page }) => {
    await mockApis(page, { all: true, magnetometer: true })
    await page.goto('/instruments/magnetometer')
    // Volver al inicio
    const homeLink = page.locator('a[href="/"]').first()
    await homeLink.click()
    await expect(page).toHaveURL('/', { timeout: 8_000 })
    // El sidebar sigue visible (aunque colapsado por defecto)
    await expect(page.locator('aside[aria-label="Barra lateral de navegación"]')).toBeVisible()
  })
})

test.describe('Páginas de clima espacial (contenido educativo)', () => {
  test('página index de fenómenos carga', async ({ page }) => {
    await page.goto('/space-weather')
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByText(/Application error/i)).not.toBeVisible()
  })

  test('artículo de fenómeno: auroras carga', async ({ page }) => {
    await page.goto('/space-weather/phenomena/aurora')
    await expect(page.getByRole('heading', { name: /aurora/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('artículo de impacto: GPS carga', async ({ page }) => {
    await page.goto('/space-weather/impacts/gps')
    await expect(page.getByRole('heading', { name: /gps/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
