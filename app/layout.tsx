import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
  <style>{`
html {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  --font-sans: system-ui;
  --font-mono: "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
}
  `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
