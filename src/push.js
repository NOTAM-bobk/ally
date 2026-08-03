// Client-side glue between the Reminders UI and the browser's Push API.
// Called from Account.jsx whenever the person saves their reminder settings.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// PushManager wants the VAPID key as a Uint8Array, but env vars/APIs give it
// to us as a URL-safe base64 string — this converts one to the other.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

// Turns push reminders on or off for this device and keeps the backend in
// sync. Returns { ok: true } on success, or { ok: false, reason } where
// reason is 'unsupported' | 'denied' | 'error'.
export async function syncPushSubscription({ enabled, intervalHours }) {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' }
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error('Missing VITE_VAPID_PUBLIC_KEY — push notifications cannot be enabled.')
    return { ok: false, reason: 'error' }
  }

  try {
    const registration = await navigator.serviceWorker.ready

    if (!enabled) {
      const existing = await registration.pushManager.getSubscription()
      if (existing) {
        await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        }).catch(() => {
          // best-effort — local unsubscribe below still happens either way
        })
        await existing.unsubscribe()
      }
      return { ok: true }
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { ok: false, reason: 'denied' }
    }

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, intervalHours, enabled: true }),
    })
    if (!response.ok) {
      return { ok: false, reason: 'error' }
    }

    return { ok: true }
  } catch (err) {
    console.error('syncPushSubscription failed', err)
    return { ok: false, reason: 'error' }
  }
}
