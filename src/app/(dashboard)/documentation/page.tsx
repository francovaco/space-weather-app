// ============================================================
// src/app/(dashboard)/documentation/page.tsx
// ============================================================
import type { Metadata } from 'next'
import { DocumentationClient } from '@/components/docs/DocumentationClient'

export const metadata: Metadata = { title: 'Documentación' }

export default function DocumentationPage() {
  return <DocumentationClient />
}
