import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createToken, timingSafeEqualString, ADMIN_COOKIE } from '@/lib/session'

const SESSION_TTL_MS = 1000 * 60 * 60 * 8 // 8 hours

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const password = typeof body?.password === 'string' ? body.password : ''
  const adminPassword = process.env.ADMIN_PASSWORD ?? ''

  if (!adminPassword || !password || !timingSafeEqualString(password, adminPassword)) {
    return NextResponse.json({ ok: false, error: 'Incorrect password.' }, { status: 401 })
  }

  const token = createToken({ admin: true, exp: Date.now() + SESSION_TTL_MS })
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })

  return NextResponse.json({ ok: true })
}
