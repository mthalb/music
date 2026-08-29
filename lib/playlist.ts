import { redis } from './redis'

export type PlaylistTrack = {
  id: string
  title: string
  artist: string
  duration: string
  path: string // B2 object key
  created_at: string
}

const INDEX_KEY = 'playlist:index'
const trackHash = (id: string) => `playlist:track:${id}`

function serialize(track: PlaylistTrack): Record<string, string> {
  return { ...track }
}

function deserialize(raw: Record<string, unknown> | null): PlaylistTrack | null {
  if (!raw || Object.keys(raw).length === 0) return null
  return {
    id: String(raw.id),
    title: String(raw.title),
    artist: String(raw.artist),
    duration: String(raw.duration),
    path: String(raw.path),
    created_at: String(raw.created_at),
  }
}

export async function listPlaylistTracks(): Promise<PlaylistTrack[]> {
  const ids = await redis.zrange<string[]>(INDEX_KEY, 0, -1)
  if (ids.length === 0) return []
  const pipeline = redis.pipeline()
  for (const id of ids) pipeline.hgetall(trackHash(id))
  const results = (await pipeline.exec()) as Record<string, unknown>[]
  return results.map(deserialize).filter((t): t is PlaylistTrack => t !== null)
}

export async function addPlaylistTrack(input: {
  title: string
  artist: string
  duration: string
  path: string
}): Promise<PlaylistTrack> {
  const id = crypto.randomUUID()
  const track: PlaylistTrack = { id, ...input, created_at: new Date().toISOString() }
  const pipeline = redis.pipeline()
  pipeline.hset(trackHash(id), serialize(track))
  pipeline.zadd(INDEX_KEY, { score: Date.parse(track.created_at), member: id })
  await pipeline.exec()
  return track
}

export async function removePlaylistTrack(id: string): Promise<void> {
  const pipeline = redis.pipeline()
  pipeline.del(trackHash(id))
  pipeline.zrem(INDEX_KEY, id)
  await pipeline.exec()
}
