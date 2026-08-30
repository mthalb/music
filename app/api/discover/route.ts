import { NextRequest, NextResponse } from 'next/server'
import { getDiscoverEnabled } from '@/lib/access-keys'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await getDiscoverEnabled())) {
    return NextResponse.json({ ok: false, error: 'Discover is turned off.' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (!q) {
    return NextResponse.json({ ok: true, tracks: [] })
  }

  const url = new URL('https://helixsong.vercel.app/api/scdlv2')
  url.searchParams.set('query', q)

  const res = await fetch(url.toString(), { cache: 'no-store' })

  if (res.status === 404) {
    return NextResponse.json({ ok: true, tracks: [] })
  }
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: 'Search failed. Try again shortly.' }, { status: 502 })
  }

  const data = await res.json()
  if (!data.status || !data.result) {
    return NextResponse.json({ ok: true, tracks: [] })
  }

  const r = data.result
  const totalSeconds = Math.round((r.duration ?? 0) / 1000)
  const track = {
    id: `helix-${encodeURIComponent(r.download_url)}`,
    title: r.title,
    artist: r.artist,
    duration: `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`,
    src: r.download_url,
    thumbnail: r.thumbnail ?? null,
  }

  return NextResponse.json({ ok: true, tracks: [track] })
}
