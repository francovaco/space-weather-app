// ============================================================
// src/lib/schemas.ts — Zod schemas for NOAA/SWPC API responses
// ============================================================
import { z } from 'zod'
import { NextResponse } from 'next/server'

// ---- Helper ------------------------------------------------

/**
 * Validates upstream data against a Zod schema.
 * On failure: logs the error and returns a 422 response.
 * On success: returns the parsed (stripped) data.
 */
export function validateData<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string,
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error(`[Zod/${context}] Validation failed`, result.error.flatten())
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid upstream data', context },
        { status: 422 },
      ),
    }
  }
  return { ok: true, data: result.data }
}

// ---- DSCOVR Magnetometer -----------------------------------

export const DSCOVRMagReadingSchema = z.object({
  time_tag: z.string(),
  bx: z.number(),
  by: z.number(),
  bz: z.number(),
  bt: z.number(),
  lat: z.number(),
  lon: z.number(),
})

export const DSCOVRMagDataSchema = z.array(DSCOVRMagReadingSchema)

// ---- Magnetometer ------------------------------------------

export const MagnetometerReadingSchema = z.object({
  time_tag: z.string(),
  satellite: z.number(),
  Hp: z.number(),
  He: z.number(),
  Hn: z.number(),
  total: z.number(),
  arcjet_flag: z.union([z.boolean(), z.number()]),
})

export const MagnetometerDataSchema = z.array(MagnetometerReadingSchema)

// ---- X-Ray Flux --------------------------------------------

export const XRayReadingSchema = z.object({
  time_tag: z.string(),
  satellite: z.number(),
  flux: z.number(),
  observed_flux: z.number(),
  electron_correction: z.number(),
  electron_contaminaton: z.boolean(), // typo is intentional — matches NOAA field name
  energy: z.enum(['0.05-0.4nm', '0.1-0.8nm']),
})

export const XRayDataSchema = z.array(XRayReadingSchema)

// ---- Electron Flux -----------------------------------------

export const ElectronFluxReadingSchema = z.object({
  time_tag: z.string(),
  satellite: z.number(),
  flux: z.number(),
  energy: z.enum(['>=2 MeV', '>=4 MeV']),
})

export const ElectronFluxDataSchema = z.array(ElectronFluxReadingSchema)

// ---- Proton Flux -------------------------------------------

export const ProtonFluxReadingSchema = z.object({
  time_tag: z.string(),
  satellite: z.number(),
  flux: z.number(),
  energy: z.enum(['>=1 MeV', '>=5 MeV', '>=10 MeV', '>=30 MeV', '>=50 MeV', '>=60 MeV', '>=100 MeV', '>=500 MeV']),
})

export const ProtonFluxDataSchema = z.array(ProtonFluxReadingSchema)

// ---- Kp Index ----------------------------------------------

export const KpReadingSchema = z.object({
  time_tag: z.string().nullable(),
  kp: z.number(),
  a_running: z.number(),
  station_count: z.number(),
})

export const KpIndexDataSchema = z.array(KpReadingSchema)

// ---- SWPC Alerts -------------------------------------------

export const SwpcAlertSchema = z.object({
  product_id: z.string(),
  issue_datetime: z.string(),
  message: z.string(),
})

export const SwpcAlertsDataSchema = z.array(SwpcAlertSchema)

// ---- Solar Cycle -------------------------------------------

export const SolarCycleObservedSchema = z.object({
  'time-tag': z.string(),
  ssn: z.number().nullable(),
  smoothed_ssn: z.number().nullable(),
  observed_swpc_ssn: z.number().nullable(),
  smoothed_swpc_ssn: z.number().nullable(),
  'f10.7': z.number().nullable(),
  'smoothed_f10.7': z.number().nullable(),
})

export const SolarCyclePredictedSchema = z.object({
  'time-tag': z.string(),
  predicted_ssn: z.number(),
  high_ssn: z.number(),
  low_ssn: z.number(),
  'predicted_f10.7': z.number(),
  'high_f10.7': z.number(),
  'low_f10.7': z.number(),
})

export const SolarCycleDataSchema = z.object({
  observed: z.array(SolarCycleObservedSchema),
  predicted: z.array(SolarCyclePredictedSchema),
})
