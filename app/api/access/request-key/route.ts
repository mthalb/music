import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { createKey, getRequestKeyCooldownSeconds, getRequestKeyTtlMinutes } from '@/lib/access-keys'

function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(request: Request) {
  const ip = clientIp(request)
  const cooldownKey = `request_key_cooldown:${ip}`
  const cooldownSeconds = await getRequestKeyCooldownSeconds()

  if (cooldownSeconds > 0) {
    const onCooldown = await redis.get(cooldownKey)
    if (onCooldown) {
      return NextResponse.json(
        { error: 'You already requested a key recently. Please wait a moment and try again.' },
        { status: 429 }
      )
    }
  }

  const ttlMinutes = await getRequestKeyTtlMinutes()
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString()

  const key = await createKey({
    label: 'Self-service request',
    access_level: 'limited',
    expires_at: expiresAt,
  })

  if (cooldownSeconds > 0) {
    await redis.set(cooldownKey, '1', { ex: cooldownSeconds })
  }

  return NextResponse.json({
    key: key.key_value,
    access_level: key.access_level,
    expires_at: key.expires_at,
    ttl_minutes: ttlMinutes,
  })
}
