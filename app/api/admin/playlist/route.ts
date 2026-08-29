import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, AdminPayload, ADMIN_COOKIE } from '@/lib/session'
import { listPlaylistTracks, addPlaylistTrack } from '@/lib/playlist'

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  return verifyToken<AdminPayload>(token) !== null
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tracks = await listPlaylistTracks()
  return NextResponse.json({ tracks })
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const { title, artist, duration, path } = body ?? {}
  if (!title || !artist || !duration || !path) {
    return NextResponse.json(
      { error: 'title, artist, duration, and path (B2 object key) are all required.' },
      { status: 400 }
    )
  }
  const track = await addPlaylistTrack({ title, artist, duration, path })
  return NextResponse.json({ track })
}
