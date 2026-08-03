// POST /api/subscribe
// Body: { subscription: PushSubscriptionJSON, intervalHours: number, enabled: boolean }
//
// Stores (or updates) one push subscription in Redis, keyed by its endpoint
// URL (which is already unique per browser/device). lastSentAt is preserved
// across updates if it already exists, so editing the interval doesn't reset
// the reminder clock — but is set to "now" on first-ever subscribe so the
// first push arrives one interval from turning reminders on, not instantly.
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
const HASH_KEY = 'push:subscriptions'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { subscription, intervalHours, enabled } = req.body || {}
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: 'Missing subscription' })
  }

  try {
    const key = subscription.endpoint
    const existing = await redis.hget(HASH_KEY, key)

    const record = {
      subscription,
      intervalHours: Number.isFinite(Number(intervalHours)) ? Number(intervalHours) : 2,
      enabled: enabled !== false,
      lastSentAt: existing?.lastSentAt ?? Date.now(),
    }

    await redis.hset(HASH_KEY, { [key]: record })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('subscribe error', err)
    return res.status(500).json({ error: 'Failed to save subscription' })
  }
}
