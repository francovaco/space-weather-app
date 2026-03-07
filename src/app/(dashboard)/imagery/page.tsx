// ============================================================
// src/app/(dashboard)/imagery/page.tsx
// ============================================================
import type { Metadata } from 'next'
import { ImageryClient } from '@/components/imagery/ImageryClient'

export const metadata: Metadata = { title: 'Imágenes ABI' }

export default function ImageryPage() {
  return <ImageryClient />
}
