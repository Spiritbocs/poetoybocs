export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// POST body: { ids: string[], query: string }
// Proxies the official fetch endpoint: /api/trade/fetch/:ids?query=:searchId
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=>null)
    if (!body || !Array.isArray(body.ids) || !body.ids.length || !body.query) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }
    const ids: string[] = body.ids.slice(0, 20) // safety cap
    const query: string = body.query
    const upstream = `https://www.pathofexile.com/api/trade/fetch/${ids.join(',')}?query=${encodeURIComponent(query)}`
    const res = await fetch(upstream, { headers: { 'User-Agent': 'spiritbocs-tracker/1.0 (+trade-fetch)' }, cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error', status: res.status }, { status: 502 })
    }
    const json = await res.json()
    return NextResponse.json({ result: json?.result || [] })
  } catch (e:any) {
    return NextResponse.json({ error: 'proxy_failure', message: e?.message }, { status: 500 })
  }
}
