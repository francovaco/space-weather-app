import type { Metadata } from 'next'
import { SWFOL1Client } from '@/components/swfo-l1/SWFOL1Client'

export const metadata: Metadata = {
  title: 'SWFO-L1 · Próximamente',
}

export default function SWFOL1Page() {
  return <SWFOL1Client />
}
