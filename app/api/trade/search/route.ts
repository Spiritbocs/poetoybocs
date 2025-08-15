export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// Simple proxy to PoE trade search API to bypass browser CORS restrictions
// Body: { league: string, query: any }
// Returns a trimmed subset of the upstream response: id, total count, and result id list (capped)
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
      // Try to read upstream body for diagnostics
      let bodyText = ''
      try {
        bodyText = await res.text()
      } catch (e) {
        bodyText = `<failed to read body: ${String(e)}>`
      }
      const truncated = bodyText.length > 2000 ? bodyText.slice(0,2000) + '... [truncated]' : bodyText
      console.error(`Trade search upstream non-ok: ${res.status} ${res.statusText} - ${truncated}`)
      return NextResponse.json({ error: 'upstream_error', status: res.status, statusText: res.statusText, body: truncated }, { status: 502 })
    }
    const json = await res.json()
    // Cap result ids to avoid huge payloads
    const result: string[] = Array.isArray(json?.result) ? json.result.slice(0, 100) : []
    return NextResponse.json({ id: json?.id, total: json?.total ?? 0, result })
  } catch (e:any) {
    return NextResponse.json({ error: 'proxy_failure', message: e?.message }, { status: 500 })
  }
}
