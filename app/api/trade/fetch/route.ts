export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// POST body: { ids: string[], query: string }
// Proxies the official fetch endpoint: /api/trade/fetch/:ids?query=:searchId
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=>null)
    // Validate that query is a non-empty string (PoE expects a search id string)
    if (!body || !Array.isArray(body.ids) || !body.ids.length || typeof body.query !== 'string' || !body.query.trim()) {
      console.error('[trade/fetch] invalid request body', { hasBody: !!body, idsLength: Array.isArray(body?.ids)? body.ids.length : 0, queryType: typeof body?.query, querySample: String(body?.query).slice(0,200) })
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }
    if (process.env.USE_TRADE_PROXY === 'false') {
      return NextResponse.json({ error: 'trade_proxy_disabled', message: 'Trade proxy is disabled by server configuration' }, { status: 503 })
    }
  // PoE trade API only allows up to 10 ids per fetch call. Cap to 10.
  const ids: string[] = body.ids.slice(0, 10)
    const query: string = body.query
    const upstream = `https://www.pathofexile.com/api/trade/fetch/${ids.join(',')}?query=${encodeURIComponent(query)}`
  console.log(`[trade/fetch] incoming ids=${ids.length} queryType=${typeof query} queryLen=${String(query).length} querySample=${String(query).slice(0,200)}`)
    const res = await fetch(upstream, { headers: { 'User-Agent': 'spiritbocs-tracker/1.0 (+trade-fetch)' }, cache: 'no-store' })
    if (!res.ok) {
      let bodyText = ''
      try { bodyText = await res.text() } catch (e) { bodyText = `<failed to read body: ${String(e)}>` }
      const truncated = bodyText.length > 2000 ? bodyText.slice(0,2000) + '... [truncated]' : bodyText
      console.error(`[trade/fetch] upstream non-ok status=${res.status} statusText=${res.statusText} body=${truncated}`)
      return NextResponse.json({ error: 'upstream_error', status: res.status, statusText: res.statusText, body: truncated }, { status: 502 })
    }
    const json = await res.json()
    return NextResponse.json({ result: json?.result || [] })
  } catch (e:any) {
    return NextResponse.json({ error: 'proxy_failure', message: e?.message }, { status: 500 })
  }
}
