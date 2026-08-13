import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createKey, listKeys, AccessLevel } from '@/lib/access-keys'
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
  const keys = await listKeys()
  return NextResponse.json({ keys })
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const label = typeof body?.label === 'string' ? body.label.trim() : ''
  const accessLevel: AccessLevel = ['none', 'limited', 'full'].includes(body?.access_level)
    ? body.access_level
    : 'limited'
  const expiresAt = typeof body?.expires_at === 'string' && body.expires_at ? body.expires_at : null

  const key = await createKey({ label: label || 'Untitled key', access_level: accessLevel, expires_at: expiresAt })
  return NextResponse.json({ key }, { status: 201 })
}
