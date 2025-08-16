export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

// Health endpoint to confirm server can see POE_TRADE_SESSION_ID env var.
// Does NOT expose full value.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const debug = url.searchParams.get('debug') === '1'
  const raw = (process.env.POE_TRADE_SESSION_ID || '').trim()
  const present = !!raw
  const meta = present ? { length: raw.length } : {}
  const masked = present ? raw.slice(0,4) + '...' + raw.slice(-4) : null
  return NextResponse.json({ ok: true, sessionPresent: present, masked: debug ? masked : undefined, meta })
}
