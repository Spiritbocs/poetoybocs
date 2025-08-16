export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks: any = { timestamp: Date.now(), env: {} }
  try {
    checks.env.USE_TRADE_PROXY = process.env.USE_TRADE_PROXY
    checks.env.RUNTIME = process.env.VERCEL ? 'vercel' : 'unknown'
    const res = await fetch('https://www.pathofexile.com/api/trade/data/leagues', { cache:'no-store', headers:{'Accept':'application/json'} })
    checks.leagues = { ok: res.ok, status: res.status }
    if (res.ok) {
      try { const js = await res.json(); checks.leagues.count = Array.isArray(js?.result)? js.result.length : undefined } catch {}
    }
  } catch (e:any) {
    checks.error = e?.message || String(e)
  }
  return NextResponse.json(checks)
}
