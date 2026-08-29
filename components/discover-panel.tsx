'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Play, Pause, Radio } from 'lucide-react'

type DiscoverTrack = { id: string; title: string; artist: string; duration: string; src: string }

export function DiscoverPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null) // null = still checking
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<DiscoverTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Probe once on mount to see if Discover is turned on; hide entirely if not.
  useEffect(() => {
    fetch('/api/discover')
      .then((res) => {
        if (res.status === 403) {
          setEnabled(false)
          return null
        }
        setEnabled(true)
        return res.json()
      })
      .then((data) => {
        if (data?.ok) setTracks(data.tracks)
      })
  }, [])

  async function search(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/discover?q=${encodeURIComponent(query)}`)
    if (res.status === 403) {
      setEnabled(false)
      setLoading(false)
      return
    }
    const data = await res.json()
    setTracks(data.ok ? data.tracks : [])
    setLoading(false)
  }

  function togglePlay(track: DiscoverTrack) {
    const audio = audioRef.current
    if (!audio) return
    if (playingId === track.id) {
      audio.pause()
      setPlayingId(null)
    } else {
      audio.src = track.src
      audio.play()
      setPlayingId(track.id)
    }
  }

  if (enabled === false) return null // Discover is off — render nothing

  return (
    <section className="playlist-pane discover-pane">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
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
          placeholder="Search Jamendo"
        />
      </form>
      <div className="playlist-scroll" aria-label="Discover results">
        <div className="track-list">
          {loading && <div className="admin-empty">Searching…</div>}
          {!loading &&
            tracks.map((t) => (
              <div className="track" key={t.id} onClick={() => togglePlay(t)} role="button" tabIndex={0}>
                <button aria-label="play">
                  {playingId === t.id ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <div className="track-info">
                  <strong>{t.title}</strong>
                  <small>{t.artist}</small>
                </div>
                <span className="duration">{t.duration}</span>
              </div>
            ))}
        </div>
      </div>
    </section>
  )
}
