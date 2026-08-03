// POST /api/unsubscribe
// Body: { endpoint: string }
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
const HASH_KEY = 'push:subscriptions'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { endpoint } = req.body || {}
  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint' })
  }

  try {
    await redis.hdel(HASH_KEY, endpoint)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('unsubscribe error', err)
    return res.status(500).json({ error: 'Failed to remove subscription' })
  }
}
