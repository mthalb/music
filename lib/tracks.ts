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
    id: 'midnight-bloom',
    title: 'Midnight Bloom',
    artist: 'Sonder Fields',
    duration: '3:42',
    path: 'music/midnight-bloom.mp3',
  },
  {
    id: 'soft-focus',
    title: 'Soft Focus',
    artist: 'Mira Sol',
    duration: '4:08',
    path: 'music/soft-focus.mp3',
  },
  {
    id: 'afterglow',
    title: 'Afterglow',
    artist: 'North Harbor',
    duration: '3:26',
    path: 'music/afterglow.mp3',
  },
  {
    id: 'paper-moons',
    title: 'Paper Moons',
    artist: 'The Quiet Hours',
    duration: '2:58',
    path: 'music/paper-moons.mp3',
  },
  {
    id: 'golden-hour',
    title: 'Golden Hour',
    artist: 'Lumen Club',
    duration: '4:21',
    path: 'music/golden-hour.mp3',
  },
  {
    id: 'low-tide',
    title: 'Low Tide',
    artist: 'Sonder Fields',
    duration: '3:17',
    path: 'music/low-tide.mp3',
  },
  {
    id: 'new-places',
    title: 'New Places',
    artist: 'Mira Sol',
    duration: '3:53',
    path: 'music/new-places.mp3',
  },
]

export function tracksForLevel(
  level: 'limited' | 'full'
): TrackManifestEntry[] {
  return level === 'full'
    ? TRACKS
    : TRACKS.slice(0, LIMITED_TRACK_COUNT)
}
