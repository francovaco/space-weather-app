// ============================================================
// src/stores/uiStore.ts — UI state (nav, preferences, alerts)
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimeRange } from '@/types/swpc'
import type { ABIBand, GOESSector, ImageResolution } from '@/types/goes'

interface UIStore {
  // Navigation
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Chart preferences
  defaultTimeRange: TimeRange
  setDefaultTimeRange: (range: TimeRange) => void

  // Imagery preferences
  selectedBand: ABIBand
  setSelectedBand: (band: ABIBand) => void
  selectedSector: GOESSector
  setSelectedSector: (sector: GOESSector) => void
  selectedResolution: ImageResolution
  setSelectedResolution: (res: ImageResolution) => void

  // SUVI preferences
  selectedSuviWavelength: string
  setSelectedSuviWavelength: (wl: string) => void

  // Coronagraph preferences
  selectedCoronagraph: string
  setSelectedCoronagraph: (src: string) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      defaultTimeRange: '1d',
      setDefaultTimeRange: (range) => set({ defaultTimeRange: range }),

      selectedBand: '13',
      setSelectedBand: (band) => set({ selectedBand: band }),

      selectedSector: 'ssa',
      setSelectedSector: (sector) => set({ selectedSector: sector }),

      selectedResolution: '678',
      setSelectedResolution: (res) => set({ selectedResolution: res }),

      selectedSuviWavelength: '171',
      setSelectedSuviWavelength: (wl) => set({ selectedSuviWavelength: wl }),

      selectedCoronagraph: 'GOES-CCOR-1',
      setSelectedCoronagraph: (src) => set({ selectedCoronagraph: src }),
    }),
    {
      name: 'ui-preferences',
    }
  )
)
