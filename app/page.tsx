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

type Track = { title: string; artist: string; duration: string }
type AccessLevel = 'none' | 'limited' | 'full'

const tracks: Track[] = [
  { title: 'Midnight Bloom', artist: 'Sonder Fields', duration: '3:42' },
  { title: 'Soft Focus', artist: 'Mira Sol', duration: '4:08' },
  { title: 'Afterglow', artist: 'North Harbor', duration: '3:26' },
  { title: 'Paper Moons', artist: 'The Quiet Hours', duration: '2:58' },
  { title: 'Golden Hour', artist: 'Lumen Club', duration: '4:21' },
  { title: 'Low Tide', artist: 'Sonder Fields', duration: '3:17' },
  { title: 'New Places', artist: 'Mira Sol', duration: '3:53' },
]

const LIMITED_TRACK_COUNT = 3
const SESSION_POLL_MS = 12000

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
  const availableTracks = level === 'full' ? tracks : tracks.slice(0, LIMITED_TRACK_COUNT)
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<number[]>([1])

  useEffect(() => {
    async function poll() {
      const response = await fetch('/api/access/session', { cache: 'no-store' })
      const data = await response.json()
      if (data.level === 'none') onRevoked()
    }
    const interval = setInterval(poll, SESSION_POLL_MS)
    return () => clearInterval(interval)
  }, [onRevoked])

  const filtered = useMemo(
    () => availableTracks.filter((track) => `${track.title} ${track.artist}`.toLowerCase().includes(query.toLowerCase())),
    [query, availableTracks]
  )
  const track = availableTracks[current] ?? availableTracks[0]

  function toggleFavorite(index: number) {
    setFavorites((items) => (items.includes(index) ? items.filter((item) => item !== index) : [...items, index]))
  }

  return (
    <main className="music-app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
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
          <div className="now-meta"><h1>{track.title}</h1><p>{track.artist}</p></div>
          <div className="progress-row"><span>1:24</span><input aria-label="Track progress" type="range" min="0" max="100" defaultValue="38" /><span>{track.duration}</span></div>
          <div className="controls">
            <button aria-label="Previous track" onClick={() => setCurrent((current - 1 + availableTracks.length) % availableTracks.length)}><SkipBack /></button>
            <button className="play-button" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button>
            <button aria-label="Next track" onClick={() => setCurrent((current + 1) % availableTracks.length)}><SkipForward /></button>
          </div>
          <div className="volume"><Volume2 size={16} /><input aria-label="Volume" type="range" min="0" max="100" defaultValue="72" /></div>
        </section>
        <aside className="playlist-pane">
          <div className="playlist-heading"><div><p className="eyebrow">THE COLLECTION</p><h2>Evening rotation</h2></div><ListMusic size={20} /></div>
          <label className="search-wrap"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your library" aria-label="Search your library" /></label>
          <div className="playlist-scroll" aria-label="Playlist tracks">
            <div className="track-list">
              {filtered.map((item) => { const index = availableTracks.indexOf(item); return <div className={`track ${index === current ? 'active' : ''}`} key={item.title} onClick={() => { setCurrent(index); setPlaying(true) }} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setCurrent(index)}><span className="track-num">{String(index + 1).padStart(2, '0')}</span><span className="eq" aria-hidden="true"><i /><i /><i /></span><div className="track-info"><strong>{item.title}</strong><small>{item.artist}</small></div><span className="duration">{item.duration}</span><button className="fav" aria-label={`Favorite ${item.title}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(index) }}><Heart size={16} fill={favorites.includes(index) ? 'currentColor' : 'none'} /></button></div> })}
            </div>
          </div>
          <footer className="playlist-footer"><span>{availableTracks.length} tracks{level === 'limited' ? ` of ${tracks.length}` : ''}</span><span><span className="gold-dot" /> curated for you</span></footer>
        </aside>
      </div>
    </main>
  )
}
