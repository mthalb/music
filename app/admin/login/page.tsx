'use client'

import { useState } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setLoading(false)
        setError(data?.error ?? 'Something went wrong.')
        return
      }
      setSuccess(true)
      window.location.assign('/admin')
    } catch {
      setLoading(false)
      setError('Could not reach the server. Check your connection and try again.')
    }
  }

  return (
    <main className="admin-gate">
      <div className="admin-gate-ambient a1" />
      <div className="admin-gate-ambient a2" />
      <form className="admin-gate-card" onSubmit={handleSubmit}>
        <div className="admin-gate-icon"><ShieldCheck size={22} /></div>
        <h1>Admin access</h1>
        <p>Enter the admin password to manage listener access keys.</p>
        <label className="admin-gate-field">
          <LockKeyhole size={16} />
          <input
            type="password"
            autoFocus
            placeholder="Admin password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p className="admin-gate-error">{error}</p>}
        <button type="submit" disabled={loading || success || !password}>
          {success ? 'Access granted — opening dashboard…' : loading ? 'Checking…' : 'Enter dashboard'}
        </button>
      </form>
    </main>
  )
}
