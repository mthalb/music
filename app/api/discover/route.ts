import { NextRequest, NextResponse } from 'next/server'
import { getDiscoverEnabled } from '@/lib/access-keys'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await getDiscoverEnabled())) {
    return NextResponse.json({ ok: false, error: 'Discover is turned off.' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const clientId = process.env.JAMENDO_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ ok: false, error: 'Jamendo not configured' }, { status: 500 })
  }

  const url = new URL('https://api.jamendo.com/v3.0/tracks/')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '20')
  if (q) url.searchParams.set('namesearch', q)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  const data = await res.json()

  const tracks = (data.results ?? []).map((t: any) => ({
    id: `jamendo-${t.id}`,
    title: t.name,
    artist: t.artist_name,
    duration: t.duration
      ? `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`
      : '0:00',
    src: t.audio,
  }))

  return NextResponse.json({
    ok: true,
    tracks,
    debug: { requestedUrl: url.toString().replace(clientId, 'HIDDEN'), resultsCount: data.results?.length ?? 0, jamendoStatus: data.headers?.status },
  })
}
