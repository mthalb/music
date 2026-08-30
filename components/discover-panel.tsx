'use client'

import { useEffect, useState } from 'react'
import { Search, Play, Pause, Radio } from 'lucide-react'

export type DiscoverTrack = { id: string; title: string; artist: string; duration: string; src: string }

type Props = {
  activeTrackId: string | null
  isPlaying: boolean
  onSelectTrack: (track: DiscoverTrack) => void
}

export function DiscoverPanel({ activeTrackId, isPlaying, onSelectTrack }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null) // null = still checking
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<DiscoverTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Probe once on mount to see if Discover is turned on; hide entirely if not.
  useEffect(() => {
    fetch('/api/discover')
      .then((res) => {
        setEnabled(res.status !== 403)
      })
      .catch(() => setEnabled(true))
  }, [])

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setNotFound(false)
    const res = await fetch(`/api/discover?q=${encodeURIComponent(query)}`)
    if (res.status === 403) {
      setEnabled(false)
      setLoading(false)
      return
    }
    const data = await res.json()
    const results = data.ok ? data.tracks : []
    setTracks(results)
    setNotFound(data.ok && results.length === 0)
    setLoading(false)
  }

  if (enabled === false) return null // Discover is off — render nothing

  return (
    <section className="playlist-pane discover-pane">
      <div className="playlist-heading">
        <div>
          <p className="eyebrow">FREE INTERNET MUSIC</p>
          <h2>Discover</h2>
        </div>
        <Radio size={20} />
      </div>
      <form onSubmit={search} className="search-wrap">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any song name"
        />
      </form>
      <div className="playlist-scroll" aria-label="Discover results">
        <div className="track-list">
          {loading && <div className="admin-empty">Searching…</div>}
          {!loading && notFound && <div className="admin-empty">No match found. Try a different title.</div>}
          {!loading &&
            tracks.map((t) => {
              const active = t.id === activeTrackId
              return (
                <div
                  className={`track ${active ? 'active' : ''}`}
                  key={t.id}
                  onClick={() => onSelectTrack(t)}
                  role="button"
                  tabIndex={0}
                >
                  <button aria-label="play">
                    {active && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <div className="track-info">
                    <strong>{t.title}</strong>
                    <small>{t.artist}</small>
                  </div>
                  <span className="duration">{t.duration}</span>
                </div>
              )
            })}
        </div>
      </div>
    </section>
  )
}
