'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock,
  Heart,
  KeyRound,
  ListMusic,
  Lock,
  Loader2,
  Pause,
  Play,
  Search,
  ShieldAlert,
  Sparkles,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react'
import { DiscoverPanel } from '@/components/discover-panel'

type ApiTrack = { id: string; title: string; artist: string; duration: string; src: string }
type AccessLevel = 'none' | 'limited' | 'full'

const SESSION_POLL_MS = 12000

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Page() {
  const [checking, setChecking] = useState(true)
  const [level, setLevel] = useState<AccessLevel>('none')
  const [revoked, setRevoked] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [pendingLevel, setPendingLevel] = useState<AccessLevel | null>(null)
  const [unlockProgress, setUnlockProgress] = useState(0)
  const [requesting, setRequesting] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [requestInfo, setRequestInfo] = useState('')
  const hadAccess = useRef(false)

  async function checkSession() {
    const response = await fetch('/api/access/session', { cache: 'no-store' })
    const data = await response.json()
    const nextLevel: AccessLevel = data.level ?? 'none'
    if (hadAccess.current && nextLevel === 'none') {
      setRevoked(true)
    }
    if (nextLevel !== 'none') hadAccess.current = true
    setLevel(nextLevel)
    setChecking(false)
  }

  useEffect(() => {
    checkSession()
    const interval = setInterval(checkSession, SESSION_POLL_MS)
    return () => clearInterval(interval)
  }, [])

  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault()
    setUnlockError('')
    setUnlocking(true)
    const response = await fetch('/api/access/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: keyInput.trim() }),
    })
    setUnlocking(false)
    const data = await response.json()
    if (!response.ok) {
      setUnlockError(data.error ?? 'Invalid key.')
      return
    }
    setRevoked(false)
    hadAccess.current = true
    setKeyInput('')
    setPendingLevel(data.level)
  }

  const handleRevoked = useCallback(() => {
    hadAccess.current = false
    setLevel('none')
    setRevoked(true)
  }, [])

  useEffect(() => {
    if (!pendingLevel) return
    setUnlockProgress(0)
    const durationMs = 4000
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100))
      setUnlockProgress(pct)
      if (pct >= 100) {
        clearInterval(interval)
        setLevel(pendingLevel)
        setPendingLevel(null)
      }
    }, 40)
    return () => clearInterval(interval)
  }, [pendingLevel])

  async function handleRequestKey() {
    setRequestError('')
    setRequestInfo('')
    setRequesting(true)
    const response = await fetch('/api/access/request-key', { method: 'POST' })
    const data = await response.json()
    setRequesting(false)
    if (!response.ok) {
      setRequestError(data.error ?? 'Could not generate a key right now.')
      return
    }
    setKeyInput(data.key)
    setUnlockError('')
    const minutes = data.ttl_minutes ?? Math.round((new Date(data.expires_at).getTime() - Date.now()) / 60000)
    setRequestInfo(`Key generated — valid for ${minutes} minute${minutes === 1 ? '' : 's'}. Press Unlock to continue.`)
  }

  if (pendingLevel) {
    return (
      <main className="access-gate">
        <div className="access-gate-ambient g1" />
        <div className="access-gate-ambient g2" />
        <div className="access-loading-card">
          <div className="access-gate-icon"><Loader2 size={20} className="access-loading-spin" /></div>
          <h1>Unlocking Orbital</h1>
          <p>Setting up your listening room…</p>
          <div className="access-loading-bar">
            <div className="access-loading-fill" style={{ width: `${unlockProgress}%` }} />
          </div>
          <span className="access-loading-percent">{unlockProgress}%</span>
        </div>
      </main>
    )
  }

  if (checking) {
    return (
      <main className="access-gate">
        <p className="access-gate-hint">Checking access…</p>
      </main>
    )
  }

  if (level === 'none') {
    return (
      <main className="access-gate">
        <div className="access-gate-ambient g1" />
        <div className="access-gate-ambient g2" />
        {revoked && <div className="access-revoked-banner">Access was revoked. Enter a new key to continue.</div>}
        <form className="access-gate-card" onSubmit={handleUnlock}>
          <div className="access-gate-icon"><Lock size={20} /></div>
          <h1>Orbital is locked</h1>
          <p>This listening room requires an access key. Ask the owner for one, or use the admin dashboard to issue keys.</p>
          <label className="access-gate-field">
            <KeyRound size={16} />
            <input
              placeholder="Paste your access key"
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
              autoFocus
            />
          </label>
          {unlockError && <p className="access-gate-error">{unlockError}</p>}
          <button type="submit" disabled={unlocking || !keyInput.trim()}>
            {unlocking ? 'Checking…' : 'Unlock'}
          </button>
        </form>

        <div className="access-request-card">
          <div className="access-request-heading">
            <Clock size={14} />
            <span>Don&apos;t have a key?</span>
          </div>
          <p>Request a temporary access key. It&apos;ll be filled in above automatically.</p>
          {requestInfo && <p className="access-request-info">{requestInfo}</p>}
          {requestError && <p className="access-gate-error">{requestError}</p>}
          <button
            type="button"
            className="access-request-button"
            onClick={handleRequestKey}
            disabled={requesting}
          >
            <Sparkles size={14} /> {requesting ? 'Generating…' : 'Request a key'}
          </button>
        </div>
      </main>
    )
  }

  return <Player level={level} onRevoked={handleRevoked} />
}

function Player({ level, onRevoked }: { level: AccessLevel; onRevoked: () => void }) {
  const [tracks, setTracks] = useState<ApiTrack[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(72)
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<number[]>([])
  const [externalTrack, setExternalTrack] = useState<ApiTrack | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const refetchingRef = useRef(false)

  // Load (and refresh) signed track URLs from the gated API.
  const loadTracks = useCallback(async () => {
    const response = await fetch('/api/tracks', { cache: 'no-store' })
    if (response.status === 401) {
      onRevoked()
      return null
    }
    const data = await response.json()
    if (!response.ok || !data.ok) {
      setLoadError(data.error ?? 'Could not load your library.')
      setLoading(false)
      return null
    }
    setTracks(data.tracks)
    setTotal(data.total ?? data.tracks.length)
    setLoadError('')
    setLoading(false)
    return data.tracks as ApiTrack[]
  }, [onRevoked])

  useEffect(() => {
    loadTracks()
  }, [loadTracks])

  // Session revocation polling (kept from the original).
  useEffect(() => {
    async function poll() {
      const response = await fetch('/api/access/session', { cache: 'no-store' })
      const data = await response.json()
      if (data.level === 'none') onRevoked()
    }
    const interval = setInterval(poll, SESSION_POLL_MS)
    return () => clearInterval(interval)
  }, [onRevoked])

  const track = externalTrack ?? tracks[current]

  // Streamed (Discover) audio often reports an unreliable/incomplete native
  // duration since it has no Content-Length. Trust the API's own duration
  // metadata for external tracks instead of the <audio> element's guess.
  function parseDurationToSeconds(value: string | undefined): number {
    if (!value) return 0
    const [m, s] = value.split(':').map(Number)
    if (Number.isNaN(m) || Number.isNaN(s)) return 0
    return m * 60 + s
  }
  const metaDurationSeconds = parseDurationToSeconds(track?.duration)
  const effectiveDuration = externalTrack && metaDurationSeconds > 0 ? metaDurationSeconds : duration

  // Keep the <audio> element's play/pause state in sync with React state.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return
    if (playing) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [playing, current, track])

  // Apply volume changes to the element.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [volume, current])

  const goTo = useCallback(
    (index: number) => {
      if (tracks.length === 0) return
      setExternalTrack(null)
      const next = (index + tracks.length) % tracks.length
      setCurrent(next)
      setCurrentTime(0)
      setDuration(0)
    },
    [tracks.length]
  )

  const handleEnded = useCallback(() => {
    if (externalTrack) {
      setExternalTrack(null)
      setPlaying(false)
      return
    }
    if (tracks.length === 0) return
    goTo(current + 1)
    setPlaying(true)
  }, [current, externalTrack, goTo, tracks.length])

  // Called when a Discover result is selected — plays through the same player/controls.
  const playExternal = useCallback(
    (t: ApiTrack) => {
      if (externalTrack?.id === t.id) {
        setPlaying((p) => !p)
        return
      }
      setExternalTrack(t)
      setCurrentTime(0)
      setDuration(0)
      setPlaying(true)
    },
    [externalTrack]
  )

  // A signed URL may have expired between load and playback — refetch once and retry.
  const handleAudioError = useCallback(async () => {
    if (refetchingRef.current) return
    refetchingRef.current = true
    const fresh = await loadTracks()
    refetchingRef.current = false
    if (fresh && fresh[current] && audioRef.current) {
      audioRef.current.load()
      if (playing) audioRef.current.play().catch(() => setPlaying(false))
    }
  }, [current, loadTracks, playing])

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value)
    if (audioRef.current && effectiveDuration > 0) {
      audioRef.current.currentTime = (value / 100) * effectiveDuration
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  function toggleFavorite(index: number) {
    setFavorites((items) => (items.includes(index) ? items.filter((item) => item !== index) : [...items, index]))
  }

  const filtered = useMemo(
    () => tracks.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(query.toLowerCase())),
    [query, tracks]
  )

  const progressPct = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0

  return (
    <main className="music-app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {track && (
        <audio
          ref={audioRef}
          src={track.src}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={handleEnded}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={handleAudioError}
        />
      )}

      <header className="topbar">
        <div className="brand-mark"><span>O</span><span>R</span></div>
        <div className="brand-copy"><strong>ORBITAL</strong><small>personal listening room</small></div>
        {level === 'limited' && (
          <span className="limited-banner"><ShieldAlert size={12} /> Limited access</span>
        )}
        <button className="profile" aria-label="Open profile" style={level === 'limited' ? undefined : { marginLeft: 'auto' }}>JS</button>
      </header>

      <div className="layout">
        <section className="player-pane" aria-label="Now playing">
          <div className="eyebrow"><span className="live-dot" /> NOW PLAYING</div>
          <div className={`album-art ${playing ? 'is-playing' : ''}`} aria-label="Abstract album artwork"><div className="art-orbit orbit-a" /><div className="art-orbit orbit-b" /><div className="art-sun" /><div className="art-line" /></div>
          <div className="now-meta">
            <h1>{loading ? 'Loading…' : track ? track.title : 'Nothing to play'}</h1>
            <p>{track ? track.artist : loadError || (loading ? 'Fetching your library' : 'No tracks available')}</p>
          </div>
          <div className="progress-row">
            <span>{formatTime(currentTime)}</span>
            <input
              aria-label="Track progress"
              type="range"
              min="0"
              max="100"
              value={progressPct}
              onChange={handleSeek}
              disabled={!track}
            />
            <span>{effectiveDuration > 0 ? formatTime(effectiveDuration) : track ? track.duration : '0:00'}</span>
          </div>
          <div className="controls">
            <button aria-label="Previous track" onClick={() => goTo(current - 1)} disabled={!track}><SkipBack /></button>
            <button className="play-button" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)} disabled={!track}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button>
            <button aria-label="Next track" onClick={() => goTo(current + 1)} disabled={!track}><SkipForward /></button>
          </div>
          <div className="volume"><Volume2 size={16} /><input aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></div>
        </section>

        <div className="playlist-column">
          <DiscoverPanel
            activeTrackId={externalTrack?.id ?? null}
            isPlaying={playing}
            onSelectTrack={playExternal}
          />

          <aside className="playlist-pane">
            <div className="playlist-heading"><div><p className="eyebrow">THE COLLECTION</p><h2>Evening rotation</h2></div><ListMusic size={20} /></div>
            <label className="search-wrap"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your library" aria-label="Search your library" /></label>
            <div className="playlist-scroll" aria-label="Playlist tracks">
              <div className="track-list">
                {filtered.map((item) => {
                  const index = tracks.indexOf(item)
                  return (
                    <div className={`track ${index === current && !externalTrack ? 'active' : ''}`} key={item.id} onClick={() => { setExternalTrack(null); goTo(index); setPlaying(true) }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') { setExternalTrack(null); goTo(index); setPlaying(true) } }}>
                      <span className="track-num">{String(index + 1).padStart(2, '0')}</span>
                      <span className="eq" aria-hidden="true"><i /><i /><i /></span>
                      <div className="track-info"><strong>{item.title}</strong><small>{item.artist}</small></div>
                      <span className="duration">{item.duration}</span>
                      <button className="fav" aria-label={`Favorite ${item.title}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(index) }}><Heart size={16} fill={favorites.includes(index) ? 'currentColor' : 'none'} /></button>
                    </div>
                  )
                })}
              </div>
            </div>
            <footer className="playlist-footer"><span>{tracks.length} tracks{level === 'limited' ? ` of ${total}` : ''}</span><span><span className="gold-dot" /> curated for you</span></footer>
          </aside>
        </div>
      </div>
    </main>
  )
}
