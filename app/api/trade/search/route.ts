export const dynamic = 'force-dynamic'
// Force Node.js runtime (avoid Edge subtle header differences that may trigger upstream 403)
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

// Basic in-memory adaptive backoff when repeated 403s occur (resets on success)
let consecutiveForbidden = 0
let lastForbiddenAt = 0
let cookieHeader: string | null = null
let cookieFetchInFlight: Promise<void> | null = null

async function ensureCookies(league: string) {
  if (cookieHeader || cookieFetchInFlight) {
    if (cookieFetchInFlight) {
      try { await cookieFetchInFlight } catch { /* ignore */ }
    }
    return
  }
  cookieFetchInFlight = (async () => {
    try {
      // Hitting a real trade search page to obtain Cloudflare / site cookies.
      const url = `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`
      const res = await fetch(url, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml' }, cache: 'no-store' })
      // Attempt to extract all set-cookie headers
      let cookies: string[] = []
      const single = res.headers.get('set-cookie')
      if (single) cookies.push(single)
      const rawFn = (res.headers as any).raw ? (res.headers as any).raw : (res as any).headers?.raw
      if (rawFn) {
        try {
          const raw = rawFn.call(res.headers)
          if (raw && raw['set-cookie']) {
            cookies = raw['set-cookie']
          }
        } catch { /* ignore */ }
      }
      // Normalize into Cookie header form (only name=value parts)
      const simple = cookies.map(c => c.split(';')[0]).filter(Boolean)
      if (simple.length) {
        cookieHeader = simple.join('; ')
        console.log('[trade/search] acquired cookies', simple.map(s=> s.split('=')[0]))
      }
    } catch (e) {
      console.warn('[trade/search] cookie acquisition failed', e)
    } finally {
      cookieFetchInFlight = null
    }
  })()
  await cookieFetchInFlight
}

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

    const uaPool = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
    ]
    const defaultUA = process.env.POE_TRADE_USER_AGENT || uaPool[Math.floor(Math.random()*uaPool.length)]

  async function doSearch(extraHeaders:Record<string,string> = {}): Promise<{ ok:boolean; status:number; statusText:string; json?:any; text?:string }> {
      const res = await fetch(upstream, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': defaultUA,
      'Origin': 'https://www.pathofexile.com',
      // Use league-specific referer (mirrors real site navigation) which may help Cloudflare heuristics
      'Referer': `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`,
      'X-Requested-With': 'XMLHttpRequest',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
      ...extraHeaders
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
    // Light adaptive delay if many 403s recently to avoid hammering
    if (consecutiveForbidden >= 3) {
      const since = Date.now() - lastForbiddenAt
      const backoff = Math.min(4000, 500 * consecutiveForbidden)
      if (since < backoff) {
        await new Promise(r=> setTimeout(r, backoff - since))
      }
    }
    let attempt = await doSearch()
    // If forbidden (Cloudflare / upstream) try a lightweight warm-up fetch then retry once.
    if (!attempt.ok && attempt.status === 403) {
      try {
        // Warm-up endpoints (leagues + items) to simulate normal browsing sequence
        await fetch('https://www.pathofexile.com/api/trade/data/leagues', { headers:{ 'User-Agent': defaultUA, 'Accept':'application/json, text/plain, */*' }, cache:'no-store' })
        await fetch('https://www.pathofexile.com/api/trade/data/items', { headers:{ 'User-Agent': defaultUA, 'Accept':'application/json, text/plain, */*' }, cache:'no-store' })
    await fetch('https://www.pathofexile.com/api/trade/data/static', { headers:{ 'User-Agent': defaultUA, 'Accept':'application/json, text/plain, */*' }, cache:'no-store' })
      } catch {}
      attempt = await doSearch()
    }
    // Acquire cookies and retry if still forbidden and no cookie yet
    if (!attempt.ok && attempt.status === 403 && !cookieHeader) {
      await ensureCookies(league)
      attempt = await doSearch()
    }
    // Final contingency: minor UA variance (some CDNs fingerprint exact UA string)
    if (!attempt.ok && attempt.status === 403) {
      const variedUA = defaultUA.replace(/Chrome\/(\d+)/, (m, v)=> `Chrome/${v}.${Math.floor(Math.random()*10)}`)
      attempt = await doSearch({ 'User-Agent': variedUA })
    }
    if (!attempt.ok) {
      const bodyText = attempt.text || ''
      const truncated = bodyText.length > 2000 ? bodyText.slice(0,2000) + '... [truncated]' : bodyText
      // Pass through real upstream status (avoid masking 403 as 502) for clearer client handling
      console.error(`Trade search upstream non-ok: ${attempt.status} ${attempt.statusText} - ${truncated}`)
      if (attempt.status === 403) {
        consecutiveForbidden++
        lastForbiddenAt = Date.now()
      } else {
        consecutiveForbidden = 0
      }
      return NextResponse.json({ error: 'upstream_error', status: attempt.status, statusText: attempt.statusText, body: truncated, hint: attempt.status===403 ? 'Forbidden – upstream may be blocking serverless IP range. Consider external proxy or self-host.' : undefined }, { status: attempt.status })
    }
    consecutiveForbidden = 0
    const json = attempt.json ?? {}
    // Cap result ids to avoid huge payloads
    const result: string[] = Array.isArray(json?.result) ? json.result.slice(0, 100) : []
    return NextResponse.json({ id: json?.id, total: json?.total ?? 0, result })
  } catch (e:any) {
    return NextResponse.json({ error: 'proxy_failure', message: e?.message }, { status: 500 })
  }
}
