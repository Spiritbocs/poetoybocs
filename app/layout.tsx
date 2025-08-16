import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/error-boundary'
import { LeagueProvider } from '@/components/league-context'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'Spiritbocs Tracker',
  description: 'Spiritbocs Tracker — Path of Exile economy & currency monitor',
  generator: 'Spiritbocs',
  icons: {
    icon: 'https://i.imgur.com/lo3oTYL.png',
    shortcut: 'https://i.imgur.com/lo3oTYL.png',
    apple: 'https://i.imgur.com/lo3oTYL.png'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="https://i.imgur.com/lo3oTYL.png" />
  <style>{`
html, body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  --font-sans: system-ui;
  --font-mono: "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
  background: #0a0a0a !important;
  color: #f0f0f0 !important;
}
* {
  color: inherit !important;
}
  `}</style>
      </head>
  <body suppressHydrationWarning style={{minHeight:'100vh',display:'flex',flexDirection:'column', background:'#0a0a0a', color:'#f0f0f0'}}>
        <LeagueProvider>
          <div style={{flex:1}}>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </LeagueProvider>
  <Analytics />
  <footer style={{padding:'16px 24px',fontSize:12,display:'flex',justifyContent:'center',borderTop:'1px solid #444',background:'#1a1a1a',color:'#c0c0c0'}}>
          <span style={{opacity:.9}}>Spiritbocs© 2025 — Not affiliated with Grinding Gear Games</span>
        </footer>
      </body>
    </html>
  )
}
