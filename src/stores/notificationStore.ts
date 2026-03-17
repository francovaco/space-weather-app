import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationState {
  enabled: boolean
  lastNotifiedXray: string | null     // ISO Date
  lastNotifiedKp: string | null       // ISO Date
  lastNotifiedGScale: string | null   // ISO Date
  lastSeenAlertDatetime: string | null // Latest SWPC alert datetime seen

  // Settings
  minKpThreshold: number
  notifyXClass: boolean
  notifyG3Plus: boolean
  notifySwpcAlerts: boolean           // Official SWPC alerts/watches/warnings

  setEnabled: (enabled: boolean) => void
  setSettings: (settings: Partial<Pick<NotificationState, 'minKpThreshold' | 'notifyXClass' | 'notifyG3Plus' | 'notifySwpcAlerts'>>) => void
  markNotified: (type: 'xray' | 'kp' | 'gscale', timestamp: string) => void
  markAlertSeen: (datetime: string) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      enabled: false,
      lastNotifiedXray: null,
      lastNotifiedKp: null,
      lastNotifiedGScale: null,
      lastSeenAlertDatetime: null,

      minKpThreshold: 5, // G1 default
      notifyXClass: true,
      notifyG3Plus: true,
      notifySwpcAlerts: true,

      setEnabled: (enabled) => set({ enabled }),
      setSettings: (settings) => set((state) => ({ ...state, ...settings })),
      markNotified: (type, timestamp) => set((state) => ({
        ...state,
        [`lastNotified${type.charAt(0).toUpperCase() + type.slice(1)}`]: timestamp,
      })),
      markAlertSeen: (datetime) => set({ lastSeenAlertDatetime: datetime }),
    }),
    {
      name: 'space-weather-notifications',
    }
  )
)
