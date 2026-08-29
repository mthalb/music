import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getRequestKeyCooldownSeconds,
  getRequestKeyTtlMinutes,
  setRequestKeyCooldownSeconds,
  setRequestKeyTtlMinutes,
  getDiscoverEnabled,
  setDiscoverEnabled,
} from '@/lib/access-keys'
import { verifyToken, AdminPayload, ADMIN_COOKIE } from '@/lib/session'

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  return verifyToken<AdminPayload>(token) !== null
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [request_key_ttl_minutes, request_key_cooldown_seconds, discover_enabled] = await Promise.all([
    getRequestKeyTtlMinutes(),
    getRequestKeyCooldownSeconds(),
    getDiscoverEnabled(),
  ])
  return NextResponse.json({ request_key_ttl_minutes, request_key_cooldown_seconds, discover_enabled })
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)

  // Discover toggle can be sent alone, without the other settings.
  if (typeof body?.discover_enabled === 'boolean' && body.request_key_ttl_minutes === undefined) {
    const saved = await setDiscoverEnabled(body.discover_enabled)
    return NextResponse.json({ discover_enabled: saved })
  }

  const ttlMinutes = Number(body?.request_key_ttl_minutes)
  const cooldownSeconds = Number(body?.request_key_cooldown_seconds)

  if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
    return NextResponse.json({ error: 'Duration must be a positive number of minutes.' }, { status: 400 })
  }
  if (!Number.isFinite(cooldownSeconds) || cooldownSeconds < 0) {
    return NextResponse.json({ error: 'Cooldown must be zero or a positive number of seconds.' }, { status: 400 })
  }

  const tasks: Promise<unknown>[] = [
    setRequestKeyTtlMinutes(ttlMinutes),
    setRequestKeyCooldownSeconds(cooldownSeconds),
  ]
  if (typeof body?.discover_enabled === 'boolean') {
    tasks.push(setDiscoverEnabled(body.discover_enabled))
  }

  const [savedTtl, savedCooldown] = await Promise.all(tasks)

  return NextResponse.json({
    request_key_ttl_minutes: savedTtl,
    request_key_cooldown_seconds: savedCooldown,
  })
}
