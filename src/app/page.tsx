// ============================================================
// src/app/page.tsx — Main dashboard
// ============================================================
import type { Metadata } from 'next'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export const metadata: Metadata = {
  title: 'Panel Principal',
}

export default function DashboardPage() {
  return <DashboardClient />
}
