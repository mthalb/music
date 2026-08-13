import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { redis } from '@/lib/redis'
import { ADMIN_COOKIE } from '@/lib/session'

const ADMIN_SESSION_PREFIX = 'admin_session:'
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24

export async function createAdminSession() {
  const sessionId = randomBytes(32).toString('base64url')
  await redis.set(`${ADMIN_SESSION_PREFIX}${sessionId}`, true, {
    ex: ADMIN_SESSION_TTL_SECONDS,
  })
  return sessionId
}

export async function requireAdminSession() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(ADMIN_COOKIE)?.value
  if (!sessionId) return false
  return (await redis.get<boolean>(`${ADMIN_SESSION_PREFIX}${sessionId}`)) === true
}

export async function deleteAdminSession() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(ADMIN_COOKIE)?.value
  if (sessionId) await redis.del(`${ADMIN_SESSION_PREFIX}${sessionId}`)
  cookieStore.delete(ADMIN_COOKIE)
}

export const ADMIN_SESSION_MAX_AGE = ADMIN_SESSION_TTL_SECONDS
