export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// Simple proxy to PoE trade search API to bypass browser CORS restrictions
// Body: { league: string, query: any }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=>null)
    if (!body || !body.league || !body.query) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }
    const { league, query } = body
    const upstream = `https://www.pathofexile.com/api/trade/search/${encodeURIComponent(league)}`
    const res = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'spiritbocs-tracker/1.0 (+trade-proxy)'
      },
      body: JSON.stringify(query),
      cache: 'no-store'
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error', status: res.status }, { status: 502 })
    }
    const json = await res.json()
    return NextResponse.json({ id: json?.id, total: json?.total ?? 0 })
  } catch (e:any) {
    return NextResponse.json({ error: 'proxy_failure', message: e?.message }, { status: 500 })
  }
}
