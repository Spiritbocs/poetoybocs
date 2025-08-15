import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'vsCode',
  description: 'Created with vsCode',
  generator: 'vsCode.app',
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
