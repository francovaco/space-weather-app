/**
 * Layout & App Shell tests
 * Verifica que la estructura base de la app carga correctamente:
 * sidebar, topbar, reloj UTC, barra de clima espacial, accesibilidad.
 */
import { test, expect } from '@playwright/test'
import { mockApis } from './helpers/mock-api'

test.describe('App Shell', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { all: true })
    await page.goto('/')
  })

  test('título de la app está en el documento', async ({ page }) => {
    await expect(page).toHaveTitle(/Monitor Espacial|Space Weather/i)
  })

  test('sidebar es visible y contiene el logo', async ({ page }) => {
    const sidebar = page.locator('nav, aside').first()
    await expect(sidebar).toBeVisible()
    // El texto "Monitor Espacial" aparece en el sidebar expandido
    await expect(page.getByText('Monitor Espacial').first()).toBeVisible()
  })

  test('topbar muestra el reloj UTC', async ({ page }) => {
    // El reloj UTC usa "UTC" como label — espera que aparezca
    await expect(page.getByText(/UTC/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('skip-to-main link existe (accesibilidad)', async ({ page }) => {
    // El link está oculto visualmente pero presente en el DOM para lectores de pantalla
    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toBeAttached()
  })

  test('contenido principal tiene id main-content', async ({ page }) => {
    const main = page.locator('#main-content')
    await expect(main).toBeAttached()
  })
})

test.describe('Layout móvil', () => {
  test('app carga en viewport móvil sin errores críticos', async ({ page }) => {
    await mockApis(page, { all: true })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    // La página debe renderizarse — al menos el body existe y no hay texto de error de hydration
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByText(/Application error/i)).not.toBeVisible()
  })
})
