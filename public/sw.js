'use strict'
// ============================================================
// public/sw.js — Service Worker
// Responsibilities:
//   1. PWA offline caching (static assets)
//   2. Push notification handler (Web Push API)
//   3. Periodic Background Sync (check alerts when tab is closed)
// ============================================================

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `goes-static-${CACHE_VERSION}`

// Assets cached on install for offline support
const STATIC_ASSETS = ['/', '/manifest.webmanifest', '/app-logo.png', '/app-logo-sq.png']

// IndexedDB config shared with the main app (ServiceWorkerRegistration.tsx)
const PREFS_DB_NAME = 'space-weather-sw'
const PREFS_DB_VERSION = 1
const PREFS_STORE = 'prefs'

// ── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

// ── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('goes-') && k !== STATIC_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) return

  // API routes: always network-first, no caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Static assets: cache-first, populate cache on miss
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      })
    }),
  )
})

// ── Push (Web Push API) ──────────────────────────────────────────────────────
// Receives a push from the server and shows a rich notification.
// Payload format: { title, body, tag?, url?, requireInteraction? }
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Alerta de Clima Espacial', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/app-logo.png',
      badge: '/app-logo-sq.png',
      tag: payload.tag || 'space-weather',
      data: { url: payload.url || '/' },
      requireInteraction: payload.requireInteraction || false,
    }),
  )
})

// ── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing tab if available
      for (const client of windowClients) {
        if (client.url.startsWith(location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(targetUrl)
    }),
  )
})

// ── Periodic Background Sync ─────────────────────────────────────────────────
// Fires periodically (min every 5 min) even when all tabs are closed.
// Reads user preferences from IndexedDB, then checks SWPC thresholds.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sw-weather-check') {
    event.waitUntil(runBackgroundCheck())
  }
})

async function runBackgroundCheck() {
  const prefs = await readPrefs()
  if (!prefs?.enabled) return

  const tasks = []
  if (prefs.notifyG3Plus) tasks.push(checkKpAlert(prefs))
  if (prefs.notifyXClass) tasks.push(checkXRayAlert(prefs))

  await Promise.allSettled(tasks)
}

// ── Kp Index check ───────────────────────────────────────────────────────────
async function checkKpAlert(prefs) {
  try {
    const resp = await fetch('/api/swpc/kp-index')
    if (!resp.ok) return
    const data = await resp.json()
    if (!Array.isArray(data) || !data.length) return

    const latest = data[data.length - 1]
    const threshold = prefs.minKpThreshold ?? 5

    if (latest.kp >= threshold && latest.time_tag !== prefs.lastNotifiedKp) {
      const level = kpToStormLevel(latest.kp)
      await self.registration.showNotification(`🛰️ Tormenta Geomagnética ${level}`, {
        body: `Índice Kp = ${latest.kp}. Posibles interferencias en GPS y redes eléctricas.`,
        icon: '/app-logo.png',
        badge: '/app-logo-sq.png',
        tag: 'kp-storm',
        data: { url: '/instruments/kp-index' },
      })
      await savePrefs({ ...prefs, lastNotifiedKp: latest.time_tag })
    }
  } catch {
    // Network unavailable — silent fail
  }
}

// ── X-Ray flux check ─────────────────────────────────────────────────────────
async function checkXRayAlert(prefs) {
  try {
    const resp = await fetch('/api/swpc/xray-flux?range=1-hour')
    if (!resp.ok) return
    const data = await resp.json()
    if (!Array.isArray(data) || !data.length) return

    const longWave = data.filter((d) => d.energy === '0.1-0.8nm')
    const latest = longWave[longWave.length - 1]

    if (latest?.flux >= 1e-4 && latest.time_tag !== prefs.lastNotifiedXray) {
      await self.registration.showNotification('🌋 Fulguración Solar Clase X', {
        body: `Flujo detectado: ${latest.flux.toExponential(2)} W/m². Posibles apagones de radio R3+.`,
        icon: '/app-logo.png',
        badge: '/app-logo-sq.png',
        tag: 'flare-x',
        data: { url: '/instruments/xray-flux' },
      })
      await savePrefs({ ...prefs, lastNotifiedXray: latest.time_tag })
    }
  } catch {
    // Network unavailable — silent fail
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function kpToStormLevel(kp) {
  if (kp >= 9) return 'G5 (Extrema)'
  if (kp >= 8) return 'G4 (Severa)'
  if (kp >= 7) return 'G3 (Fuerte)'
  if (kp >= 6) return 'G2 (Moderada)'
  return 'G1 (Menor)'
}

// ── IndexedDB prefs (shared with main thread) ────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PREFS_DB_NAME, PREFS_DB_VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(PREFS_STORE, { keyPath: 'key' })
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

async function readPrefs() {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(PREFS_STORE, 'readonly')
      const req = tx.objectStore(PREFS_STORE).get('notification-prefs')
      req.onsuccess = () => resolve(req.result?.value ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function savePrefs(value) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(PREFS_STORE, 'readwrite')
      tx.objectStore(PREFS_STORE).put({ key: 'notification-prefs', value })
      tx.oncomplete = () => resolve(undefined)
      tx.onerror = () => resolve(undefined)
    })
  } catch {
    // ignore
  }
}
