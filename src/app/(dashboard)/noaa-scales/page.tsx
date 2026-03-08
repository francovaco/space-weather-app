import { Metadata } from 'next'
import { NoaaScalesClient } from './NoaaScalesClient'

export const metadata: Metadata = {
  title: 'Escalas NOAA de Clima Espacial | GOES-19',
  description: 'Explicación de las escalas NOAA de clima espacial: Tormentas de Radio (R), Tormentas de Radiación Solar (S) y Tormentas Geomagnéticas (G)',
}

export default function NoaaScalesPage() {
  return <NoaaScalesClient />
}
