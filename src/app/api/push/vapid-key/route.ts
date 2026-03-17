// ============================================================
// src/app/api/push/vapid-key/route.ts
// Returns the VAPID public key so the browser can subscribe.
// ============================================================
import { NextResponse } from 'next/server'

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 })
  }
  return NextResponse.json({ publicKey })
}
