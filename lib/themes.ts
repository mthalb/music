export type ThemeId = 'light' | 'dark' | 'gold' | 'midnight'

export const THEME_STORAGE_KEY = 'orbital-theme'

export const themes: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'light', label: 'Light', swatch: '#f5f2ec' },
  { id: 'dark', label: 'Dark', swatch: '#0b0e14' },
  { id: 'gold', label: 'Gold', swatch: '#c9863a' },
  { id: 'midnight', label: 'Midnight', swatch: '#5b3fd6' },
]

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var key = '${THEME_STORAGE_KEY}';
    var stored = localStorage.getItem(key);
    var theme = stored;
    if (!theme || theme === 'auto') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`
