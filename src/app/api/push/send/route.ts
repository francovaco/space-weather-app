// ============================================================
// src/app/api/push/send/route.ts
// Internal endpoint to send a push to all stored subscriptions.
// Called server-side when a threshold event is detected.
// Payload: { title, body, tag?, url?, requireInteraction? }
// ============================================================
import { NextResponse } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL ?? 'admin@localhost'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? '',
)

export async function POST(req: Request) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 503 })
  }

  try {
    const payload = await req.json()
    const subscriptions: webpush.PushSubscription[] = globalThis.__pushSubscriptions ?? []
    if (!subscriptions.length) return NextResponse.json({ sent: 0 })

    const results = await Promise.allSettled(
      subscriptions.map((sub) => webpush.sendNotification(sub, JSON.stringify(payload))),
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({ sent, failed })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
