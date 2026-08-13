import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getRequestKeyCooldownSeconds,
  getRequestKeyTtlMinutes,
  setRequestKeyCooldownSeconds,
  setRequestKeyTtlMinutes,
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
  const [request_key_ttl_minutes, request_key_cooldown_seconds] = await Promise.all([
    getRequestKeyTtlMinutes(),
    getRequestKeyCooldownSeconds(),
  ])
  return NextResponse.json({ request_key_ttl_minutes, request_key_cooldown_seconds })
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)

  const ttlMinutes = Number(body?.request_key_ttl_minutes)
  const cooldownSeconds = Number(body?.request_key_cooldown_seconds)

  if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
    return NextResponse.json({ error: 'Duration must be a positive number of minutes.' }, { status: 400 })
  }
  if (!Number.isFinite(cooldownSeconds) || cooldownSeconds < 0) {
    return NextResponse.json({ error: 'Cooldown must be zero or a positive number of seconds.' }, { status: 400 })
  }

  const [savedTtl, savedCooldown] = await Promise.all([
    setRequestKeyTtlMinutes(ttlMinutes),
    setRequestKeyCooldownSeconds(cooldownSeconds),
  ])

  return NextResponse.json({
    request_key_ttl_minutes: savedTtl,
    request_key_cooldown_seconds: savedCooldown,
  })
}
