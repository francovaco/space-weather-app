// ============================================================
// src/app/api/push/subscribe/route.ts
// Stores a Web Push subscription from the browser.
// In production, persist to a database. Here we use an
// in-process store (sufficient for a single-user dashboard).
// ============================================================
import { NextResponse } from 'next/server'
import type { PushSubscription } from 'web-push'

// In-process store — survives hot reloads in dev, resets on deploy.
// For multi-user production use, replace with a database.
declare global {
  // eslint-disable-next-line no-var
  var __pushSubscriptions: PushSubscription[] | undefined
}
globalThis.__pushSubscriptions ??= []

export async function POST(req: Request) {
  try {
    const subscription: PushSubscription = await req.json()
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }
    // Upsert by endpoint
    const idx = globalThis.__pushSubscriptions!.findIndex((s) => s.endpoint === subscription.endpoint)
    if (idx >= 0) {
      globalThis.__pushSubscriptions![idx] = subscription
    } else {
      globalThis.__pushSubscriptions!.push(subscription)
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { endpoint } = await req.json()
    globalThis.__pushSubscriptions = globalThis.__pushSubscriptions!.filter(
      (s) => s.endpoint !== endpoint,
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
