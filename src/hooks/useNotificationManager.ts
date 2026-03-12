'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getXRayFluxData, getKpIndexData } from '@/lib/swpc-api'
import { useNotificationStore } from '@/stores/notificationStore'

export function useNotificationManager() {
  const { 
    enabled, 
    minKpThreshold, 
    notifyXClass, 
    notifyG3Plus,
    lastNotifiedKp,
    lastNotifiedXray,
    markNotified 
  } = useNotificationStore()

  // Polling data specifically for alerts (not linked to UI, runs in background)
  const { data: xray } = useQuery({
    queryKey: ['alerts-xray'],
    queryFn: () => getXRayFluxData('1-hour'),
    refetchInterval: 60000,
    enabled: enabled
  })

  const { data: kp } = useQuery({
    queryKey: ['alerts-kp'],
    queryFn: () => getKpIndexData(),
    refetchInterval: 60000,
    enabled: enabled
  })

  // Watch for alerts
  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined') return

    // 1. Check X-Ray flares (X Class)
    if (notifyXClass && xray && xray.length > 0) {
      const longWave = (xray as any[]).filter(d => d.energy === '0.1-0.8nm')
      const latest = longWave[longWave.length - 1]
      
      if (latest && latest.flux >= 1e-4) { // X-Class threshold
        const ts = latest.time_tag
        if (ts !== lastNotifiedXray) {
          sendNotification('🌋 ALERTA: Fulguración Solar Clase X', {
            body: `Se ha detectado una erupción masiva (clase X). Posibles apagones de radio R3+.`,
            icon: '/favicon.ico',
            tag: 'flare-x'
          })
          markNotified('xray', ts)
        }
      }
    }

    // 2. Check Kp Index
    if (kp && (kp as any[]).length > 0) {
      const latest = (kp as any[])[(kp as any[]).length - 1]
      const currentKp = latest.kp
      const ts = latest.time_tag

      if (currentKp >= minKpThreshold && ts !== lastNotifiedKp) {
        const stormLevel = getStormLevel(currentKp)
        sendNotification(`🛰️ ALERTA: Tormenta Geomagnética ${stormLevel}`, {
          body: `El índice Kp ha alcanzado ${currentKp}. Posibles interferencias en GPS y redes eléctricas.`,
          icon: '/favicon.ico',
          tag: 'kp-storm'
        })
        markNotified('kp', ts)
      }
    }
  }, [enabled, xray, kp, notifyXClass, minKpThreshold, lastNotifiedXray, lastNotifiedKp, markNotified])

  function sendNotification(title: string, options: NotificationOptions) {
    if (Notification.permission === 'granted') {
      new Notification(title, options)
    }
  }

  function getStormLevel(kp: number) {
    if (kp >= 9) return 'G5 (Extrema)'
    if (kp >= 8) return 'G4 (Severa)'
    if (kp >= 7) return 'G3 (Fuerte)'
    if (kp >= 6) return 'G2 (Moderada)'
    if (kp >= 5) return 'G1 (Menor)'
    return 'G0'
  }
}
