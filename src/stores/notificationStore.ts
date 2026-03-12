import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationState {
  enabled: boolean
  lastNotifiedXray: string | null // ISO Date
  lastNotifiedKp: string | null   // ISO Date
  lastNotifiedGScale: string | null // ISO Date
  
  // Settings
  minKpThreshold: number
  notifyXClass: boolean
  notifyG3Plus: boolean

  setEnabled: (enabled: boolean) => void
  setSettings: (settings: Partial<Pick<NotificationState, 'minKpThreshold' | 'notifyXClass' | 'notifyG3Plus'>>) => void
  markNotified: (type: 'xray' | 'kp' | 'gscale', timestamp: string) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      enabled: false,
      lastNotifiedXray: null,
      lastNotifiedKp: null,
      lastNotifiedGScale: null,
      
      minKpThreshold: 5, // G1 default
      notifyXClass: true,
      notifyG3Plus: true,

      setEnabled: (enabled) => set({ enabled }),
      setSettings: (settings) => set((state) => ({ ...state, ...settings })),
      markNotified: (type, timestamp) => set((state) => ({
        ...state,
        [`lastNotified${type.charAt(0).toUpperCase() + type.slice(1)}`]: timestamp
      })),
    }),
    {
      name: 'space-weather-notifications',
    }
  )
)
