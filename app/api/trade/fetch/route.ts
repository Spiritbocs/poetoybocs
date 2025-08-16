export const dynamic = 'force-dynamic'
// Force Node.js runtime (Edge sometimes yields different headers / fetch behavior leading to upstream 403 or pricing mismatch)
export const runtime = 'nodejs'
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
    const defaultUA = process.env.POE_TRADE_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    const res = await fetch(upstream, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': defaultUA,
        'Origin': 'https://www.pathofexile.com',
        'Referer': 'https://www.pathofexile.com/trade/search'
      },
      cache: 'no-store'
    })
    if (!res.ok) {
      let bodyText = ''
      try { bodyText = await res.text() } catch (e) { bodyText = `<failed to read body: ${String(e)}>` }
      const truncated = bodyText.length > 2000 ? bodyText.slice(0,2000) + '... [truncated]' : bodyText
      console.error(`[trade/fetch] upstream non-ok status=${res.status} statusText=${res.statusText} body=${truncated}`)
      return NextResponse.json({ error: 'upstream_error', status: res.status, statusText: res.statusText, body: truncated }, { status: res.status })
    }
    const json = await res.json()
    return NextResponse.json({ result: json?.result || [] })
  } catch (e:any) {
    return NextResponse.json({ error: 'proxy_failure', message: e?.message }, { status: 500 })
  }
}
