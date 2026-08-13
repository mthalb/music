import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import ThemeToggle from '@/components/theme-toggle'
import { THEME_INIT_SCRIPT } from '@/lib/themes'
import './globals.css'

export const metadata: Metadata = {
  title: 'Orbital — Personal Listening Room',
  description: 'A focused music player for your evening rotation.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        {children}
        <ThemeToggle />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
