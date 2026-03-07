// ============================================================
// src/lib/goes-imagery.ts — GOES-19 ABI image URL builders
// ============================================================
import type { ABIBand, GOESSector, ImageResolution } from '@/types/goes'

const CDN = 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI'

/** 
 * Build the URL for a specific ABI band image from the NESDIS CDN.
 * Images are updated every 10 minutes.
 * 
 * URL pattern:
 * https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/{SECTOR}/ABI-{SECTOR}-{BAND}/{TIMESTAMP}_{RESOLUTION}.jpg
 * 
 * For full disk:
 * https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/{BAND}/{TIMESTAMP}_{RESOLUTION}.jpg
 */
export function buildImageUrl(
  band: ABIBand,
  sector: GOESSector,
  resolution: ImageResolution,
  timestamp?: string
): string {
  const bandNum = parseInt(band, 10)
  const paddedBand = String(bandNum).padStart(2, '0')

  if (sector === 'FD') {
    if (timestamp) {
      return `${CDN}/FD/${paddedBand}/${timestamp}_${resolution}.jpg`
    }
    return `${CDN}/FD/${paddedBand}/latest.jpg`
  }

  const sectorUpper = sector.toUpperCase()
  if (timestamp) {
    return `${CDN}/SECTOR/${sectorUpper}/ABI-${sectorUpper}-${paddedBand}/${timestamp}_${resolution}.jpg`
  }
  return `${CDN}/SECTOR/${sectorUpper}/ABI-${sectorUpper}-${paddedBand}/latest.jpg`
}

/**
 * Build URL to the STAR image list JSON for a band/sector.
 * This endpoint returns available timestamps.
 */
export function buildImageListUrl(band: ABIBand, sector: GOESSector): string {
  const sectorUpper = sector === 'FD' ? 'FD' : sector.toUpperCase()
  const paddedBand = band.padStart(2, '0')
  return `/api/goes/imagery?band=${paddedBand}&sector=${sectorUpper}`
}

/**
 * Build animated GIF URL from STAR/NESDIS.
 * 
 * Pattern: https://www.star.nesdis.noaa.gov/GOES/GOES19_sector_band.gif
 */
export function buildAnimatedGifUrl(band: ABIBand, sector: GOESSector): string {
  const paddedBand = band.padStart(2, '0')
  return `https://www.star.nesdis.noaa.gov/GOES/GOES19_${sector}_Band${paddedBand}.gif`
}

/**
 * Resolution labels for download options
 */
export const RESOLUTION_OPTIONS: { value: ImageResolution; label: string }[] = [
  { value: '339', label: '339px (thumbnail)' },
  { value: '678', label: '678px (low res)' },
  { value: '1808', label: '1808px (medium)' },
  { value: '5424', label: '5424px (high res)' },
  { value: '10848', label: '10848px (full res)' },
]

/**
 * Sector options for the imagery viewer
 */
export const SECTOR_OPTIONS: { value: GOESSector; label: string }[] = [
  { value: 'FD', label: 'Full Disk' },
  { value: 'CONUS', label: 'Continental US (CONUS)' },
  { value: 'ssa', label: 'South America (SSA)' },
  { value: 'MESO1', label: 'Mesoscale 1' },
  { value: 'MESO2', label: 'Mesoscale 2' },
]

/**
 * GOES imagery refresh interval: 10 minutes
 */
export const IMAGERY_REFRESH_MS = 10 * 60 * 1000

/**
 * Generate an array of the last N image timestamps (10-min intervals)
 */
export function generateRecentTimestamps(count: number): Date[] {
  const now = new Date()
  // Round down to nearest 10 minutes
  const roundedNow = new Date(now)
  roundedNow.setMinutes(Math.floor(roundedNow.getMinutes() / 10) * 10, 0, 0)

  const timestamps: Date[] = []
  for (let i = count - 1; i >= 0; i--) {
    const ts = new Date(roundedNow.getTime() - i * 10 * 60 * 1000)
    timestamps.push(ts)
  }
  return timestamps
}
