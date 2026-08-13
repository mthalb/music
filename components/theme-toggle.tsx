'use client'

import { useEffect, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { themes, ThemeId, THEME_STORAGE_KEY } from '@/lib/themes'

export default function ThemeToggle() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<ThemeId | 'auto'>('auto')

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | 'auto' | null
    setActive(stored ?? 'auto')

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function followSystem() {
      const current = localStorage.getItem(THEME_STORAGE_KEY)
      if (!current || current === 'auto') {
        document.documentElement.setAttribute('data-theme', media.matches ? 'dark' : 'light')
      }
    }
    media.addEventListener('change', followSystem)
    return () => media.removeEventListener('change', followSystem)
  }, [])

  function selectTheme(id: ThemeId) {
    localStorage.setItem(THEME_STORAGE_KEY, id)
    document.documentElement.setAttribute('data-theme', id)
    setActive(id)
    setOpen(false)
  }

  function followSystemTheme() {
    localStorage.setItem(THEME_STORAGE_KEY, 'auto')
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    setActive('auto')
    setOpen(false)
  }

  return (
    <div className="theme-toggle">
      {open && (
        <div className="theme-menu" role="menu">
          {themes.map((theme) => (
            <button
              key={theme.id}
              className={`theme-option ${active === theme.id ? 'is-active' : ''}`}
              onClick={() => selectTheme(theme.id)}
              role="menuitem"
            >
              <span className="theme-swatch" style={{ background: theme.swatch }} />
              {theme.label}
              {active === theme.id && <Check size={13} className="theme-check" />}
            </button>
          ))}
          <button className={`theme-option theme-auto ${active === 'auto' ? 'is-active' : ''}`} onClick={followSystemTheme} role="menuitem">
            <span className="theme-swatch theme-swatch-auto" />
            Match system
            {active === 'auto' && <Check size={13} className="theme-check" />}
          </button>
        </div>
      )}
      <button
        className="theme-fab"
        aria-label="Change theme"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Palette size={19} />
      </button>
    </div>
  )
}
