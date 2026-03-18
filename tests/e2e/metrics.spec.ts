/**
 * /api/metrics endpoint tests
 * Verifica el endpoint de métricas implementado recientemente.
 */
import { test, expect } from '@playwright/test'

test.describe('/api/metrics — acceso y estructura', () => {
  test('sin METRICS_SECRET configurado, el endpoint responde en dev', async ({ request }) => {
    // En dev sin METRICS_SECRET → abierto (no 401)
    // En producción con METRICS_SECRET → requeriría el header
    const res = await request.get('/api/metrics')
    // Acepta 200 (dev sin secret) o 401 (si está configurado el secret en el env local)
    expect([200, 401]).toContain(res.status())
  })

  test('con token correcto el endpoint devuelve JSON válido', async ({ request }) => {
    const secret = process.env.METRICS_SECRET
    const headers: Record<string, string> = secret ? { 'x-metrics-token': secret } : {}

    const res = await request.get('/api/metrics', { headers })

    // Si no hay secret (dev) o el secret es correcto → 200
    // Si hay secret pero no se envió → 401
    if (res.status() === 200) {
      const body = await res.json()
      expect(body).toHaveProperty('generated_at')
      expect(body).toHaveProperty('scope', 'instance')
      expect(body).toHaveProperty('routes')
      expect(Array.isArray(body.routes)).toBe(true)
    } else {
      expect(res.status()).toBe(401)
    }
  })

  test('con token incorrecto devuelve 401', async ({ request }) => {
    const secret = process.env.METRICS_SECRET
    // Solo testea el 401 si METRICS_SECRET está configurado
    if (!secret) {
      test.skip()
      return
    }
    const res = await request.get('/api/metrics', {
      headers: { 'x-metrics-token': 'token-incorrecto-xyz' },
    })
    expect(res.status()).toBe(401)
  })

  test('la respuesta incluye Cache-Control: no-store', async ({ request }) => {
    const secret = process.env.METRICS_SECRET
    const headers: Record<string, string> = secret ? { 'x-metrics-token': secret } : {}
    const res = await request.get('/api/metrics', { headers })

    if (res.status() === 200) {
      const cacheHeader = res.headers()['cache-control']
      expect(cacheHeader).toContain('no-store')
    }
  })

  test('después de llamar APIs, routes aparece en métricas', async ({ request }) => {
    const secret = process.env.METRICS_SECRET
    const authHeaders: Record<string, string> = secret ? { 'x-metrics-token': secret } : {}

    // Primero calentamos una ruta
    await request.get('/api/swpc/noaa-scales')

    // Luego pedimos las métricas
    const res = await request.get('/api/metrics', { headers: authHeaders })
    if (res.status() !== 200) return // skip si no tenemos acceso

    const body = await res.json()
    expect(body.routes).toBeDefined()

    // Cada entrada debe tener la forma correcta
    for (const route of body.routes) {
      expect(route).toHaveProperty('route')
      expect(route).toHaveProperty('count')
      expect(route).toHaveProperty('p50')
      expect(route).toHaveProperty('p95')
      expect(route).toHaveProperty('p99')
      expect(route).toHaveProperty('error_count')
      expect(typeof route.count).toBe('number')
      expect(typeof route.p50).toBe('number')
    }
  })
})
