// GET or POST /api/send-reminders?secret=YOUR_CRON_SECRET
//
// Meant to be triggered on a schedule by a free external cron service
// (e.g. cron-job.org) every 10-15 minutes, since Vercel's Hobby-plan cron
// only fires once a day. Checks every stored subscription and sends a push
// to whichever ones are due (now - lastSentAt >= intervalHours).
//
// Accepts the secret as a query param (works with any cron host, even ones
// that can't set custom headers) or as an Authorization: Bearer header.
import { Redis } from '@upstash/redis'
import webpush from 'web-push'

const redis = Redis.fromEnv()
const HASH_KEY = 'push:subscriptions'

webpush.setVapidDetails(
  'mailto:support@example.com', // any contact URI/email works here
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

function isAuthorized(req) {
  const bearer = req.headers['authorization']
  if (bearer === `Bearer ${process.env.CRON_SECRET}`) return true
  const querySecret = req.query?.secret
  if (querySecret && querySecret === process.env.CRON_SECRET) return true
  return false
}

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || !isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let all
  try {
    all = await redis.hgetall(HASH_KEY)
  } catch (err) {
    console.error('send-reminders: failed to read subscriptions', err)
    return res.status(500).json({ error: 'Failed to read subscriptions' })
  }

  if (!all || Object.keys(all).length === 0) {
    return res.status(200).json({ sent: 0, checked: 0 })
  }

  const now = Date.now()
  const entries = Object.entries(all)
  let sent = 0
  const staleKeys = []

  await Promise.all(
    entries.map(async ([key, record]) => {
      if (!record?.enabled || !record?.subscription) return

      const intervalMs = (Number(record.intervalHours) || 2) * 60 * 60 * 1000
      const last = Number(record.lastSentAt) || 0
      if (now - last < intervalMs) return

      try {
        await webpush.sendNotification(
          record.subscription,
          JSON.stringify({
            title: 'Time to hydrate 💧',
            body: 'Take a sip of water to stay on track today.',
          })
        )
        sent += 1
        await redis.hset(HASH_KEY, { [key]: { ...record, lastSentAt: now } })
      } catch (err) {
        // 404/410 means the browser has permanently invalidated this
        // subscription (uninstalled, permission revoked, etc) — clean it up.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          staleKeys.push(key)
        } else {
          console.error('send-reminders: push failed for', key, err?.statusCode || err)
        }
      }
    })
  )

  if (staleKeys.length) {
    await redis.hdel(HASH_KEY, ...staleKeys)
  }

  return res.status(200).json({ sent, checked: entries.length, removed: staleKeys.length })
}
