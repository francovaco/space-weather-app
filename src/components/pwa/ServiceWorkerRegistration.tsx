'use client'
// ============================================================
// src/components/pwa/ServiceWorkerRegistration.tsx
// Registers the service worker and keeps IndexedDB prefs in
// sync so the SW can run background checks without a page open.
// ============================================================
import { useEffect } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'

const DB_NAME = 'space-weather-sw'
const DB_VERSION = 1
const STORE_NAME = 'prefs'

function openPrefsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      ;(e.target as IDBOpenDBRequest).result.createObjectStore(STORE_NAME, { keyPath: 'key' })
    }
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result)
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error)
  })
}

async function syncPrefsToSW(prefs: Record<string, unknown>) {
  try {
    const db = await openPrefsDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put({ key: 'notification-prefs', value: prefs })
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // IndexedDB not available
  }
}

export function ServiceWorkerRegistration() {
  const {
    enabled,
    minKpThreshold,
    notifyXClass,
    notifyG3Plus,
    notifySwpcAlerts,
    lastNotifiedKp,
    lastNotifiedXray,
  } = useNotificationStore()

  // Register service worker once on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('[SW] Registration failed:', err)
    })
  }, [])

  // Keep IndexedDB in sync with Zustand so the SW background check uses
  // current thresholds even when no page is open
  useEffect(() => {
    syncPrefsToSW({
      enabled,
      minKpThreshold,
      notifyXClass,
      notifyG3Plus,
      notifySwpcAlerts,
      lastNotifiedKp,
      lastNotifiedXray,
    })
  }, [enabled, minKpThreshold, notifyXClass, notifyG3Plus, notifySwpcAlerts, lastNotifiedKp, lastNotifiedXray])

  // Register Periodic Background Sync when notifications are turned on
  useEffect(() => {
    if (!enabled) return

    async function registerPeriodicSync() {
      if (!('serviceWorker' in navigator)) return
      const registration = await navigator.serviceWorker.ready
      // Periodic Background Sync is available in Chrome/Edge 80+
      if (!('periodicSync' in registration)) return
      try {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        })
        if (status.state !== 'granted') return
        await (registration as unknown as { periodicSync: { register: (tag: string, opts: object) => Promise<void> } }).periodicSync.register(
          'sw-weather-check',
          { minInterval: 5 * 60 * 1000 }, // 5 minutes minimum
        )
      } catch {
        // Permission denied or API not available — silent fail
      }
    }

    registerPeriodicSync()
  }, [enabled])

  return null
}
