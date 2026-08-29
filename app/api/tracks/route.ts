import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  findKeyById,
  isKeyCurrentlyValid,
} from '@/lib/access-keys'
import { getSignedReadUrl } from '@/lib/b2'
import {
  verifyToken,
  type VisitorPayload,
  VISITOR_COOKIE,
} from '@/lib/session'
import { listPlaylistTracks } from '@/lib/playlist'

const SIGNED_URL_TTL_MS = 15 * 60 * 1000
const LIMITED_TRACK_COUNT = 3 // keep in sync with your old lib/tracks.ts value

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(VISITOR_COOKIE)?.value
  const payload = verifyToken<VisitorPayload>(token)

  if (!payload) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const key = await findKeyById(payload.keyId)

  if (
    !key ||
    !isKeyCurrentlyValid(key) ||
    key.access_level === 'none'
  ) {
    cookieStore.delete(VISITOR_COOKIE)

    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const all = await listPlaylistTracks()
  const manifest = key.access_level === 'full' ? all : all.slice(0, LIMITED_TRACK_COUNT)

  try {
    const tracks = await Promise.all(
      manifest.map(async (track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        src: await getSignedReadUrl(
          track.path,
          SIGNED_URL_TTL_MS
        ),
      }))
    )

    return NextResponse.json(
      {
        ok: true,
        level: key.access_level,
        total: all.length,
        tracks,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('Failed to sign track URLs:', error)

    return NextResponse.json(
      {
        ok: false,
        error: 'Could not load tracks.',
      },
      { status: 500 }
    )
  }
}
