import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/error-boundary'

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
    <html lang="en">
      <head>
        <link rel="icon" href="https://i.imgur.com/lo3oTYL.png" />
  <style>{`
html {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  --font-sans: system-ui;
  --font-mono: "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
}
  `}</style>
      </head>
      <body style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
        <div style={{flex:1}}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
        <footer style={{padding:'16px 24px',fontSize:12,display:'flex',justifyContent:'center',borderTop:'1px solid #222',background:'#111',color:'#aaa'}}>
          <span style={{opacity:.9}}>Spiritbocs© 2025 — Not affiliated with Grinding Gear Games</span>
        </footer>
      </body>
    </html>
  )
}
