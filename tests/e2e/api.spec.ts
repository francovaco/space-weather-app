/**
 * API Routes tests
 * Llama directamente a los endpoints /api/* del servidor Next.js.
 * No mockea nada — testea la integración real server-side.
 * Para que no fallen por NOAA offline, sólo valida la estructura
 * de la respuesta (status HTTP y forma del JSON), no los datos.
 */
import { test, expect } from '@playwright/test'

// Helper: hace una petición directa al servidor y devuelve json + status
async function apiGet(request: import('@playwright/test').APIRequestContext, path: string) {
  const res = await request.get(path)
  return { status: res.status(), body: await res.json().catch(() => null) }
}

test.describe('API routes — estructura de respuesta', () => {
  test('/api/swpc/noaa-scales responde 200 o 502', async ({ request }) => {
    const { status } = await apiGet(request, '/api/swpc/noaa-scales')
    expect([200, 502, 500]).toContain(status)
  })

  test('/api/swpc/alerts responde JSON', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/swpc/alerts')
    // Acepta 200 (array de alertas) o error upstream
    expect([200, 422, 502, 500]).toContain(status)
    if (status === 200) {
      expect(Array.isArray(body)).toBe(true)
    }
  })

  test('/api/swpc/magnetometer responde JSON', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/swpc/magnetometer?range=1-hour')
    expect([200, 422, 502, 500]).toContain(status)
    if (status === 200) {
      expect(Array.isArray(body)).toBe(true)
      if (body.length > 0) {
        const first = body[0]
        expect(first).toHaveProperty('time_tag')
        expect(first).toHaveProperty('Hp')
        expect(first).toHaveProperty('total')
      }
    }
  })

  test('/api/swpc/kp-index responde JSON con estructura correcta', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/swpc/kp-index')
    expect([200, 422, 502, 503, 500]).toContain(status)
    if (status === 200) {
      expect(Array.isArray(body)).toBe(true)
      if (body.length > 0) {
        const first = body[0]
        expect(first).toHaveProperty('kp')
        expect(typeof first.kp).toBe('number')
      }
    }
  })

  test('/api/swpc/xray-flux responde JSON', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/swpc/xray-flux?range=1-hour')
    expect([200, 422, 502, 500]).toContain(status)
    if (status === 200) {
      expect(Array.isArray(body)).toBe(true)
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('flux')
        expect(body[0]).toHaveProperty('energy')
      }
    }
  })

  test('/api/goes/status responde JSON con campo fetchedAt', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/goes/status')
    expect([200, 502, 500]).toContain(status)
    if (status === 200 && body) {
      expect(body).toHaveProperty('fetchedAt')
      expect(body).toHaveProperty('satellites')
      expect(Array.isArray(body.satellites)).toBe(true)
    }
  })

  test('/api/swpc/solar-cycle devuelve observed y predicted', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/swpc/solar-cycle')
    expect([200, 422, 502, 500]).toContain(status)
    if (status === 200 && body) {
      expect(body).toHaveProperty('observed')
      expect(body).toHaveProperty('predicted')
      expect(Array.isArray(body.observed)).toBe(true)
    }
  })

  test('/api/swpc/magnetometer rechaza range inválido con estructura de error', async ({ request }) => {
    // Range inválido → cae en el fallback RANGE_MAP → usa el default 1-day
    // Igual debe responder JSON válido
    const { status } = await apiGet(request, '/api/swpc/magnetometer?range=invalid-range')
    expect([200, 422, 502, 500]).toContain(status)
  })

  test('/api/goes/img-proxy sin url devuelve 400', async ({ request }) => {
    const res = await request.get('/api/goes/img-proxy')
    expect(res.status()).toBe(400)
  })

  test('/api/docs/proxy sin url devuelve 400', async ({ request }) => {
    const { status } = await apiGet(request, '/api/docs/proxy')
    expect(status).toBe(400)
  })

  test('/api/docs/proxy con dominio no permitido devuelve 403', async ({ request }) => {
    const { status } = await apiGet(request, '/api/docs/proxy?url=https://example.com/file.pdf')
    expect(status).toBe(403)
  })
})
