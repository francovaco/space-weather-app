import { ComparisonClient } from '@/components/analysis/ComparisonClient'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Análisis Comparativo — GOES-19',
  description: 'Compara múltiples instrumentos de clima espacial en tiempo real para identificar correlaciones temporales.',
}

export default function ComparisonPage() {
  return <ComparisonClient />
}
