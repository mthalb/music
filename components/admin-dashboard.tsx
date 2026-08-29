'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Ban,
  Check,
  Clock,
  Copy,
  KeyRound,
  LogOut,
  Music,
  Plus,
  Radio,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react'

type AccessLevel = 'none' | 'limited' | 'full'

type AccessKey = {
  id: string
  key_value: string
  label: string
  access_level: AccessLevel
  is_active: boolean
  expires_at: string | null
  created_at: string
  last_used_at: string | null
}

type PlaylistTrack = {
  id: string
  title: string
  artist: string
  duration: string
  path: string
}

function statusOf(key: AccessKey): { label: string; tone: 'live' | 'off' | 'expired' } {
  if (!key.is_active) return { label: 'Disabled', tone: 'off' }
  if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) return { label: 'Expired', tone: 'expired' }
  if (key.access_level === 'none') return { label: 'No access', tone: 'off' }
  return { label: 'Active', tone: 'live' }
}

function formatDate(value: string | null) {
  if (!value) return 'Never expires'
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AdminDashboard() {
  const router = useRouter()
  const [keys, setKeys] = useState<AccessKey[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [level, setLevel] = useState<AccessLevel>('limited')
  const [expiry, setExpiry] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [requestTtlMinutes, setRequestTtlMinutes] = useState('30')
  const [requestCooldownSeconds, setRequestCooldownSeconds] = useState('20')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [tracks, setTracks] = useState<PlaylistTrack[]>([])
  const [tracksLoading, setTracksLoading] = useState(true)
  const [addingTrack, setAddingTrack] = useState(false)
  const [trackTitle, setTrackTitle] = useState('')
  const [trackArtist, setTrackArtist] = useState('')
  const [trackDuration, setTrackDuration] = useState('')
  const [trackPath, setTrackPath] = useState('')
  const [trackError, setTrackError] = useState('')
  const [discoverEnabled, setDiscoverEnabled] = useState(false)
  const [savingDiscover, setSavingDiscover] = useState(false)

  async function loadKeys() {
    try {
      const response = await fetch('/api/admin/keys', { cache: 'no-store' })
      if (response.status === 401) {
        router.push('/admin/login')
        return
      }
      if (!response.ok) throw new Error('Could not load access keys.')
      const data = await response.json()
      setKeys(data.keys ?? [])
      setLoadError('')
    } catch {
      setLoadError('Could not load the admin dashboard. Please sign in again.')
    } finally {
      setLoading(false)
    }
  }

  async function loadSettings() {
    const response = await fetch('/api/admin/settings')
    if (response.status === 401) return
    const data = await response.json()
    if (typeof data.request_key_ttl_minutes === 'number') setRequestTtlMinutes(String(data.request_key_ttl_minutes))
    if (typeof data.request_key_cooldown_seconds === 'number')
      setRequestCooldownSeconds(String(data.request_key_cooldown_seconds))
    if (typeof data.discover_enabled === 'boolean') setDiscoverEnabled(data.discover_enabled)
  }

  async function loadTracks() {
    setTracksLoading(true)
    const response = await fetch('/api/admin/playlist', { cache: 'no-store' })
    if (response.ok) {
      const data = await response.json()
      setTracks(data.tracks ?? [])
    }
    setTracksLoading(false)
  }

  async function handleAddTrack(event: React.FormEvent) {
    event.preventDefault()
    setTrackError('')
    setAddingTrack(true)
    const response = await fetch('/api/admin/playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trackTitle, artist: trackArtist, duration: trackDuration, path: trackPath }),
    })
    const data = await response.json()
    setAddingTrack(false)
    if (!response.ok) {
      setTrackError(data.error ?? 'Could not add track.')
      return
    }
    setTrackTitle('')
    setTrackArtist('')
    setTrackDuration('')
    setTrackPath('')
    loadTracks()
  }

  async function removeTrack(id: string) {
    setTracks((current) => current.filter((t) => t.id !== id))
    await fetch(`/api/admin/playlist/${id}`, { method: 'DELETE' })
  }

  async function toggleDiscover() {
    const next = !discoverEnabled
    setSavingDiscover(true)
    setDiscoverEnabled(next)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discover_enabled: next }),
    })
    setSavingDiscover(false)
  }

  useEffect(() => {
    loadKeys()
    loadSettings()
    loadTracks()
  }, [])

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault()
    setSavingSettings(true)
    setSettingsSaved(false)
    const response = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_key_ttl_minutes: Number(requestTtlMinutes),
        request_key_cooldown_seconds: Number(requestCooldownSeconds),
      }),
    })
    setSavingSettings(false)
    if (response.ok) {
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    }
  }

  const stats = useMemo(() => {
    const active = keys.filter((k) => statusOf(k).tone === 'live').length
    const full = keys.filter((k) => k.access_level === 'full').length
    const limited = keys.filter((k) => k.access_level === 'limited').length
    return { total: keys.length, active, full, limited }
  }, [keys])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setCreating(true)
    const response = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label,
        access_level: level,
        expires_at: expiry ? new Date(expiry).toISOString() : null,
      }),
    })
    setCreating(false)
    if (response.ok) {
      setLabel('')
      setExpiry('')
      setLevel('limited')
      loadKeys()
    }
  }

  async function patchKey(id: string, body: Record<string, unknown>) {
    setKeys((current) => current.map((k) => (k.id === id ? { ...k, ...body } : k)))
    await fetch(`/api/admin/keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async function removeKey(id: string) {
    setKeys((current) => current.filter((k) => k.id !== id))
    await fetch(`/api/admin/keys/${id}`, { method: 'DELETE' })
  }

  async function copyKey(key: AccessKey) {
    await navigator.clipboard.writeText(key.key_value)
    setCopiedId(key.id)
    setTimeout(() => setCopiedId(null), 1600)
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <main className="admin-shell">
      <div className="admin-ambient x1" />
      <div className="admin-ambient x2" />
      <header className="admin-header">
        <div className="admin-title">
          <div className="admin-title-icon"><ShieldCheck size={20} /></div>
          <div>
            <h1>Access control</h1>
            <p>Issue and revoke listening keys in real time.</p>
          </div>
        </div>
        <button className="admin-logout" onClick={handleLogout}><LogOut size={15} /> Sign out</button>
      </header>

      <section className="admin-stats">
        <div className="admin-stat"><span className="admin-stat-value">{stats.total}</span><span className="admin-stat-label">Total keys</span></div>
        <div className="admin-stat"><span className="admin-stat-value">{stats.active}</span><span className="admin-stat-label">Active now</span></div>
        <div className="admin-stat"><span className="admin-stat-value">{stats.full}</span><span className="admin-stat-label">Full access</span></div>
        <div className="admin-stat"><span className="admin-stat-value">{stats.limited}</span><span className="admin-stat-label">Limited access</span></div>
      </section>

      <section className="admin-panel admin-create">
        <h2><Plus size={16} /> Issue a new key</h2>
        <form onSubmit={handleCreate} className="admin-create-form">
          <label>
            <span>Label</span>
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Alex's key" />
          </label>
          <label>
            <span>Access level</span>
            <select value={level} onChange={(event) => setLevel(event.target.value as AccessLevel)}>
              <option value="limited">Limited</option>
              <option value="full">Full</option>
              <option value="none">No access</option>
            </select>
          </label>
          <label>
            <span>Expires</span>
            <input type="datetime-local" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
          </label>
          <button type="submit" disabled={creating}>
            <Sparkles size={15} /> {creating ? 'Creating…' : 'Generate key'}
          </button>
        </form>
      </section>

      <section className="admin-panel admin-create">
        <h2><Clock size={16} /> Self-service requests</h2>
        <p className="admin-settings-hint">
          Visitors can request their own temporary limited-access key from the lock screen. Control how long those keys
          last and how often the same visitor can request a new one.
        </p>
        <form onSubmit={handleSaveSettings} className="admin-create-form">
          <label>
            <span>Key duration (minutes)</span>
            <input
              type="number"
              min={1}
              value={requestTtlMinutes}
              onChange={(event) => setRequestTtlMinutes(event.target.value)}
            />
          </label>
          <label>
            <span>Cooldown between requests (seconds)</span>
            <input
              type="number"
              min={0}
              value={requestCooldownSeconds}
              onChange={(event) => setRequestCooldownSeconds(event.target.value)}
            />
          </label>
          <button type="submit" disabled={savingSettings}>
            {settingsSaved ? <Check size={15} /> : <Save size={15} />} {savingSettings ? 'Saving…' : settingsSaved ? 'Saved' : 'Save settings'}
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <h2><KeyRound size={16} /> Issued keys</h2>
        {loading ? (
          <div className="admin-empty">Loading keys…</div>
        ) : loadError ? (
          <div className="admin-empty admin-load-error">{loadError}</div>
        ) : keys.length === 0 ? (
          <div className="admin-empty">No keys yet. Generate one above.</div>
        ) : (
          <div className="admin-key-list">
            {keys.map((key, index) => {
              const status = statusOf(key)
              return (
                <div className="admin-key-card" key={key.id} style={{ animationDelay: `${index * 45}ms` }}>
                  <div className="admin-key-top">
                    <div>
                      <strong>{key.label || 'Untitled key'}</strong>
                      <div className={`admin-badge admin-badge-${status.tone}`}>
                        <span className="admin-badge-dot" /> {status.label}
                      </div>
                    </div>
                    <button className="admin-icon-btn" onClick={() => removeKey(key.id)} aria-label="Delete key">
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="admin-key-value">
                    <code>{key.key_value}</code>
                    <button onClick={() => copyKey(key)} aria-label="Copy key">
                      {copiedId === key.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="admin-key-controls">
                    <label>
                      <span>Level</span>
                      <select
                        value={key.access_level}
                        onChange={(event) => patchKey(key.id, { access_level: event.target.value })}
                      >
                        <option value="full">Full</option>
                        <option value="limited">Limited</option>
                        <option value="none">No access</option>
                      </select>
                    </label>
                    <label>
                      <span>Expires</span>
                      <input
                        type="datetime-local"
                        defaultValue={key.expires_at ? new Date(key.expires_at).toISOString().slice(0, 16) : ''}
                        onBlur={(event) =>
                          patchKey(key.id, {
                            expires_at: event.target.value ? new Date(event.target.value).toISOString() : null,
                          })
                        }
                      />
                    </label>
                    <button
                      className={`admin-toggle ${key.is_active ? 'is-on' : ''}`}
                      onClick={() => patchKey(key.id, { is_active: !key.is_active })}
                    >
                      {key.is_active ? <Unlock size={14} /> : <Ban size={14} />}
                      {key.is_active ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className="admin-key-meta">
                    <span>Expires: {formatDate(key.expires_at)}</span>
                    <span>Last used: {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="admin-panel admin-create">
        <h2><Radio size={16} /> Free internet music (Discover)</h2>
        <p className="admin-settings-hint">
          When on, visitors see a separate search panel powered by Jamendo. It never adds tracks to your playlist below.
        </p>
        <button
          className={`admin-toggle ${discoverEnabled ? 'is-on' : ''}`}
          onClick={toggleDiscover}
          disabled={savingDiscover}
        >
          {discoverEnabled ? <Unlock size={14} /> : <Ban size={14} />}
          {discoverEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </section>

      <section className="admin-panel admin-create">
        <h2><Music size={16} /> Add a track to the playlist</h2>
        <p className="admin-settings-hint">
          Upload the audio file to your B2 bucket first, then add its details and object key here.
        </p>
        <form onSubmit={handleAddTrack} className="admin-create-form">
          <label>
            <span>Title</span>
            <input value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} placeholder="Track title" />
          </label>
          <label>
            <span>Artist</span>
            <input value={trackArtist} onChange={(e) => setTrackArtist(e.target.value)} placeholder="Artist name" />
          </label>
          <label>
            <span>Duration</span>
            <input value={trackDuration} onChange={(e) => setTrackDuration(e.target.value)} placeholder="e.g. 3:05" />
          </label>
          <label>
            <span>B2 object key</span>
            <input value={trackPath} onChange={(e) => setTrackPath(e.target.value)} placeholder="music/song.mp3" />
          </label>
          {trackError && <p className="access-gate-error">{trackError}</p>}
          <button type="submit" disabled={addingTrack}>
            <Plus size={15} /> {addingTrack ? 'Adding…' : 'Add track'}
          </button>
        </form>

        {tracksLoading ? (
          <div className="admin-empty">Loading playlist…</div>
        ) : tracks.length === 0 ? (
          <div className="admin-empty">No tracks yet. Add one above.</div>
        ) : (
          <div className="admin-key-list">
            {tracks.map((track) => (
              <div className="admin-key-card" key={track.id}>
                <div className="admin-key-top">
                  <div>
                    <strong>{track.title}</strong>
                    <div className="admin-badge admin-badge-live"><span className="admin-badge-dot" /> {track.artist}</div>
                  </div>
                  <button className="admin-icon-btn" onClick={() => removeTrack(track.id)} aria-label="Delete track">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="admin-key-meta">
                  <span>Duration: {track.duration}</span>
                  <span>Path: {track.path}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
