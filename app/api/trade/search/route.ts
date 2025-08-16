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
    // Respect server-side feature flag to disable calling the PoE trade API
    if (process.env.USE_TRADE_PROXY === 'false') {
      return NextResponse.json({ error: 'trade_proxy_disabled', message: 'Trade proxy is disabled by server configuration' }, { status: 503 })
    }
    const { league, query } = body
    const upstream = `https://www.pathofexile.com/api/trade/search/${encodeURIComponent(league)}`

    const defaultUA = process.env.POE_TRADE_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

    async function doSearch(): Promise<{ ok:boolean; status:number; statusText:string; json?:any; text?:string }> {
      const res = await fetch(upstream, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': defaultUA,
          'Origin': 'https://www.pathofexile.com',
          'Referer': 'https://www.pathofexile.com/trade/search'
        },
        body: JSON.stringify(query),
        cache: 'no-store'
      })
      let text = ''
      try { text = await res.text() } catch {}
      let parsed: any = undefined
      if (text) { try { parsed = JSON.parse(text) } catch { /* ignore */ } }
      return { ok: res.ok, status: res.status, statusText: res.statusText, json: parsed, text }
    }

    // First attempt
    let attempt = await doSearch()
    // If forbidden (Cloudflare / upstream) try a lightweight warm-up fetch then retry once.
    if (!attempt.ok && attempt.status === 403) {
      try {
        await fetch('https://www.pathofexile.com/api/trade/data/leagues', { headers:{ 'User-Agent': defaultUA, 'Accept':'application/json' }, cache:'no-store' })
      } catch {}
      attempt = await doSearch()
    }
    if (!attempt.ok) {
      const bodyText = attempt.text || ''
      const truncated = bodyText.length > 2000 ? bodyText.slice(0,2000) + '... [truncated]' : bodyText
      // Pass through real upstream status (avoid masking 403 as 502) for clearer client handling
      console.error(`Trade search upstream non-ok: ${attempt.status} ${attempt.statusText} - ${truncated}`)
      return NextResponse.json({ error: 'upstream_error', status: attempt.status, statusText: attempt.statusText, body: truncated }, { status: attempt.status })
    }
    const json = attempt.json ?? {}
    // Cap result ids to avoid huge payloads
    const result: string[] = Array.isArray(json?.result) ? json.result.slice(0, 100) : []
    return NextResponse.json({ id: json?.id, total: json?.total ?? 0, result })
  } catch (e:any) {
    return NextResponse.json({ error: 'proxy_failure', message: e?.message }, { status: 500 })
  }
}
