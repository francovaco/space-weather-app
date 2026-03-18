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
    // El home exporta title: 'Panel Principal', que con el template da 'Panel Principal | GOES-19 Clima Espacial'
    await expect(page).toHaveTitle(/Panel Principal|Clima Espacial/i)
  })

  test('sidebar es visible y contiene el logo', async ({ page }) => {
    // El sidebar siempre está presente aunque esté colapsado (sidebarOpen default = false)
    const sidebar = page.locator('aside[aria-label="Barra lateral de navegación"]')
    await expect(sidebar).toBeVisible()
    // Cuando está colapsado muestra la imagen del logo
    await expect(sidebar.locator('img[alt="Logo"]')).toBeVisible()
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
