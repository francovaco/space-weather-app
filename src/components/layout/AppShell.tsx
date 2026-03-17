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
      {/* Skip to main content — visible on focus for keyboard/screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:outline-none"
      >
        Saltar al contenido principal
      </a>

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
        <main id="main-content" className="flex-1 overflow-y-auto p-4" tabIndex={-1}>
          <div className="mx-auto max-w-screen-2xl animate-[fadeIn_0.3s_ease-out]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
