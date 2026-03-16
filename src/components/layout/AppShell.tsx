'use client'
// ============================================================
// src/components/layout/AppShell.tsx
// ============================================================
import { Sidebar } from '@/components/navigation/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { SpaceWeatherBar } from '@/components/layout/SpaceWeatherBar'
import { useUIStore, useUIHydrated } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUIStore()
  const hydrated = useUIHydrated()

  return (
    // Keep layout in DOM during hydration to avoid layout shift; hide visually until ready
    <div className={cn('flex h-screen overflow-hidden bg-background', !hydrated && 'invisible')}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          sidebarOpen ? 'ml-60' : 'ml-14'
        )}
      >
        {/* Top bar with clocks */}
        <TopBar />

        {/* Space weather conditions bar */}
        <SpaceWeatherBar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-screen-2xl animate-[fadeIn_0.3s_ease-out]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
