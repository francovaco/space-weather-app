'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getXRayFluxData, getKpIndexData, getSwpcAlerts } from '@/lib/swpc-api'
import type { XRayData, KpIndexData, SwpcAlert, ParsedSwpcAlert } from '@/types/swpc'
import { parseSwpcAlert } from '@/types/swpc'
import { useNotificationStore } from '@/stores/notificationStore'

// Only fire notifications for these severity levels from SWPC feed
const NOTIFY_SEVERITIES = new Set(['watch', 'warning', 'alert'])

// Emoji + label per severity
const SEVERITY_EMOJI: Record<string, string> = {
  watch:   '👁️ VIGILANCIA',
  warning: '⚠️ ADVERTENCIA',
  alert:   '🚨 ALERTA',
  summary: 'ℹ️ RESUMEN',
}

export function useNotificationManager() {
  const {
    enabled,
    minKpThreshold,
    notifyXClass,
    notifyG3Plus,
    notifySwpcAlerts,
    lastNotifiedKp,
    lastNotifiedXray,
    lastSeenAlertDatetime,
    markNotified,
    markAlertSeen,
  } = useNotificationStore()

  // --- X-Ray polling ---
  const { data: xray } = useQuery<XRayData>({
    queryKey: ['alerts-xray'],
    queryFn: () => getXRayFluxData('1-hour') as Promise<XRayData>,
    refetchInterval: 60000,
    enabled,
  })

  // --- Kp polling ---
  const { data: kp } = useQuery<KpIndexData>({
    queryKey: ['alerts-kp'],
    queryFn: () => getKpIndexData() as Promise<KpIndexData>,
    refetchInterval: 60000,
    enabled,
  })

  // --- SWPC official alerts polling (every 5 min) ---
  const { data: rawAlerts } = useQuery<SwpcAlert[]>({
    queryKey: ['alerts-swpc'],
    queryFn: () => getSwpcAlerts() as Promise<SwpcAlert[]>,
    refetchInterval: 5 * 60_000,
    enabled: enabled && notifySwpcAlerts,
  })

  // Watch X-Ray flares
  useEffect(() => {
    if (!enabled || !notifyXClass || !xray?.length) return
    const longWave = xray.filter((d) => d.energy === '0.1-0.8nm')
    const latest = longWave[longWave.length - 1]
    if (latest && latest.flux >= 1e-4 && latest.time_tag !== lastNotifiedXray) {
      sendNotification('🌋 ALERTA: Fulguración Solar Clase X', {
        body: 'Se ha detectado una erupción masiva (clase X). Posibles apagones de radio R3+.',
        icon: '/favicon.ico',
        tag: 'flare-x',
      })
      markNotified('xray', latest.time_tag)
    }
  }, [enabled, xray, notifyXClass, lastNotifiedXray, markNotified])

  // Watch Kp storms
  useEffect(() => {
    if (!enabled || !notifyG3Plus || !kp?.length) return
    const latest = kp[kp.length - 1]
    if (latest.kp >= minKpThreshold && latest.time_tag !== lastNotifiedKp) {
      const stormLevel = getStormLevel(latest.kp)
      sendNotification(`🛰️ ALERTA: Tormenta Geomagnética ${stormLevel}`, {
        body: `El índice Kp ha alcanzado ${latest.kp}. Posibles interferencias en GPS y redes eléctricas.`,
        icon: '/favicon.ico',
        tag: 'kp-storm',
      })
      markNotified('kp', latest.time_tag)
    }
  }, [enabled, kp, notifyG3Plus, minKpThreshold, lastNotifiedKp, markNotified])

  // Watch SWPC official alerts/watches/warnings
  useEffect(() => {
    if (!enabled || !notifySwpcAlerts || !rawAlerts?.length) return

    // Sort newest first
    const sorted = [...rawAlerts].sort(
      (a, b) => new Date(b.issue_datetime).getTime() - new Date(a.issue_datetime).getTime(),
    )

    const newest = sorted[0]
    if (!newest) return

    // Skip if already seen
    if (lastSeenAlertDatetime && newest.issue_datetime <= lastSeenAlertDatetime) return

    // Parse all alerts newer than what we've seen
    const unseen: ParsedSwpcAlert[] = sorted
      .filter((a) => !lastSeenAlertDatetime || a.issue_datetime > lastSeenAlertDatetime)
      .map(parseSwpcAlert)
      .filter((a) => NOTIFY_SEVERITIES.has(a.severity))

    // Fire one notification per unseen alert (most recent first, cap at 3)
    unseen.slice(0, 3).forEach((alert) => {
      const prefix = SEVERITY_EMOJI[alert.severity] ?? '📡'
      sendNotification(`${prefix}: ${alert.title}`, {
        body: alert.comment || alert.title,
        icon: '/favicon.ico',
        tag: `swpc-${alert.code}-${alert.issue_datetime}`,
      })
    })

    markAlertSeen(newest.issue_datetime)
  }, [enabled, notifySwpcAlerts, rawAlerts, lastSeenAlertDatetime, markAlertSeen])
}

function sendNotification(title: string, options: NotificationOptions) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, options)
  }
}

function getStormLevel(kpVal: number) {
  if (kpVal >= 9) return 'G5 (Extrema)'
  if (kpVal >= 8) return 'G4 (Severa)'
  if (kpVal >= 7) return 'G3 (Fuerte)'
  if (kpVal >= 6) return 'G2 (Moderada)'
  return 'G1 (Menor)'
}
