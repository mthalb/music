export type TrackManifestEntry = {
  id: string
  title: string
  artist: string
  duration: string
  path: string
}

export const LIMITED_TRACK_COUNT = 3

export const TRACKS: TrackManifestEntry[] = [
  {
    id: 'OLD TOWN ROAD',
    title: 'OLD TOWN ROAD',
    artist: 'HELIX MUSIC',
    duration: '2:37',
    path: 'music/Lil Nas X - Old Town Road (Official Video) ft. Billy Ray Cyrus - LilNasXVEVO.mp3',
  },
  {
    id: 'BAD BOY',
    title: 'BAD BOY',
    artist: 'HELIX MUSIC',
    duration: '3:05',
    path: 'music/Marwa Loud - Bad Boy (Lyrics) - Vibe Music.mp3',
  },
  {
    id: 'Love Nwantiti',
    title: 'Love Nwantiti',
    artist: 'HELIX MUSICr',
    duration: '2:25',
    path: 'music/love nwantiti (ah ah ah).mp3',
  },
  {
    id: '',
    title: '',
    artist: 'HELIX MUSIC',
    duration: ':',
    path: '',
  },
  {
    id: '',
    title: '',
    artist: 'HELIX MUSIC',
    duration: ':',
    path: 'music/',
  },
  {
    id: '',
    title: '',
    artist: 'HELIX MUSIC',
    duration: ':',
    path: 'music/',
  },
  {
    id: '',
    title: '',
    artist: 'HELIX MUSIC',
    duration: ':',
    path: 'music/',
  },
]

export function tracksForLevel(
  level: 'limited' | 'full'
): TrackManifestEntry[] {
  return level === 'full'
    ? TRACKS
    : TRACKS.slice(0, LIMITED_TRACK_COUNT)
}
