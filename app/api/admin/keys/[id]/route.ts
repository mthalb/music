import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteKey, updateKey, AccessLevel } from '@/lib/access-keys'
import { verifyToken, AdminPayload, ADMIN_COOKIE } from '@/lib/session'

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  return verifyToken<AdminPayload>(token) !== null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const update: Partial<{
    label: string
    access_level: AccessLevel
    is_active: boolean
    expires_at: string | null
  }> = {}

  if (typeof body.label === 'string') update.label = body.label
  if (['none', 'limited', 'full'].includes(body.access_level)) update.access_level = body.access_level
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active
  if (body.expires_at === null || typeof body.expires_at === 'string') update.expires_at = body.expires_at

  const key = await updateKey(id, update)
  if (!key) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ key })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  await deleteKey(id)
  return NextResponse.json({ ok: true })
}
