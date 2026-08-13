import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { findKeyByValue, isKeyCurrentlyValid, touchKey } from '@/lib/access-keys'
import { createToken, VISITOR_COOKIE } from '@/lib/session'

const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const keyValue = typeof body?.key === 'string' ? body.key.trim() : ''

  if (!keyValue) {
    return NextResponse.json({ ok: false, error: 'Enter an access key.' }, { status: 400 })
  }

  const key = await findKeyByValue(keyValue)

  if (!key || !isKeyCurrentlyValid(key) || key.access_level === 'none') {
    return NextResponse.json({ ok: false, error: 'That key is invalid or no longer active.' }, { status: 401 })
  }

  await touchKey(key.id)

  const token = createToken({
    keyId: key.id,
    level: key.access_level as 'limited' | 'full',
    exp: Date.now() + SESSION_TTL_MS,
  })

  const cookieStore = await cookies()
  cookieStore.set(VISITOR_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })

  return NextResponse.json({ ok: true, level: key.access_level })
}
