/**
 * Helpers for intercepting internal /api/* calls made by TanStack Query.
 * The browser fetches /api/swpc/... etc. — those ARE interceptable with page.route().
 * External NOAA calls (server → NOAA) are NOT interceptable here; they're handled
 * by the Next.js API routes which respond with our mocked fixtures instead.
 *
 * Usage:
 *   await mockApis(page, { magnetometer: true, kpIndex: true })
 *   await page.goto('/instruments/magnetometer')
 */
import type { Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const FIXTURES_DIR = path.join(__dirname, '../fixtures')

function load(name: string) {
  return fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf-8')
}

function json200(body: string) {
  return { status: 200, contentType: 'application/json', body }
}

export type MockOptions = {
  magnetometer?: boolean
  kpIndex?: boolean
  xrayFlux?: boolean
  electronFlux?: boolean
  protonFlux?: boolean
  dscovrMag?: boolean
  noaaScales?: boolean
  alerts?: boolean
  goesStatus?: boolean
  /** Mock all of the above */
  all?: boolean
}

export async function mockApis(page: Page, opts: MockOptions = {}): Promise<void> {
  const active = opts.all
    ? {
        magnetometer: true,
        kpIndex: true,
        xrayFlux: true,
        electronFlux: true,
        protonFlux: true,
        dscovrMag: true,
        noaaScales: true,
        alerts: true,
        goesStatus: true,
      }
    : opts

  if (active.magnetometer) {
    await page.route('**/api/swpc/magnetometer**', (r) => r.fulfill(json200(load('magnetometer'))))
  }
  if (active.kpIndex) {
    await page.route('**/api/swpc/kp-index**', (r) => r.fulfill(json200(load('kp-index'))))
  }
  if (active.xrayFlux) {
    await page.route('**/api/swpc/xray-flux**', (r) => r.fulfill(json200(load('xray-flux'))))
  }
  if (active.electronFlux) {
    await page.route('**/api/swpc/electron-flux**', (r) => r.fulfill(json200(load('electron-flux'))))
  }
  if (active.protonFlux) {
    await page.route('**/api/swpc/proton-flux**', (r) => r.fulfill(json200(load('proton-flux'))))
  }
  if (active.dscovrMag) {
    await page.route('**/api/swpc/dscovr-mag**', (r) => r.fulfill(json200(load('dscovr-mag'))))
  }
  if (active.noaaScales) {
    await page.route('**/api/swpc/noaa-scales**', (r) => r.fulfill(json200(load('noaa-scales'))))
  }
  if (active.alerts) {
    await page.route('**/api/swpc/alerts**', (r) => r.fulfill(json200(load('alerts'))))
  }
  if (active.goesStatus) {
    await page.route('**/api/goes/status**', (r) => r.fulfill(json200(load('goes-status'))))
  }
}
