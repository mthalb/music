import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { findKeyById, isKeyCurrentlyValid } from '@/lib/access-keys'
import { verifyToken, VisitorPayload, VISITOR_COOKIE } from '@/lib/session'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(VISITOR_COOKIE)?.value
  const payload = verifyToken<VisitorPayload>(token)

  if (!payload) {
    return NextResponse.json({ ok: false, level: 'none' as const })
  }

  const key = await findKeyById(payload.keyId)

  if (!key || !isKeyCurrentlyValid(key)) {
    cookieStore.delete(VISITOR_COOKIE)
    return NextResponse.json({ ok: false, level: 'none' as const })
  }

  return NextResponse.json({ ok: true, level: key.access_level })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(VISITOR_COOKIE)
  return NextResponse.json({ ok: true })
}
