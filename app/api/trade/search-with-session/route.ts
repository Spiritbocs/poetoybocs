export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.league || !body.query) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    // Check if trade proxy is disabled
    if (process.env.USE_TRADE_PROXY === 'false') {
      return NextResponse.json({ 
        error: 'trade_proxy_disabled', 
        message: 'Trade proxy is disabled by server configuration' 
      }, { status: 503 })
    }

    const { league, query, sessionId } = body
    const upstream = `https://www.pathofexile.com/api/trade/search/${encodeURIComponent(league)}`

    // Use user-provided session ID first, fallback to server environment variable
    const useSessionId = sessionId || process.env.POE_TRADE_SESSION_ID
    
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
    ]
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)]

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': userAgent,
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    }

    // Add session cookie if available
    if (useSessionId) {
      headers['Cookie'] = `POESESSID=${useSessionId}`
    }

    console.log(`[trade/search] Attempting search for league: ${league}, sessionId: ${useSessionId ? 'provided' : 'none'}`)

    const res = await fetch(upstream, {
      method: 'POST',
      headers,
      body: JSON.stringify(query),
      cache: 'no-store'
    })

    console.log(`[trade/search] Response: ${res.status} ${res.statusText}`)

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error')
      console.error(`[trade/search] Error ${res.status}: ${errorText}`)
      
      return NextResponse.json({
        error: 'trade_api_error',
        status: res.status,
        statusText: res.statusText,
        message: res.status === 403 ? 'Access forbidden - invalid or expired session' : `Trade API error: ${res.status}`,
        details: errorText.substring(0, 200)
      }, { status: res.status })
    }

    const data = await res.json()
    
    // Return simplified response to reduce payload size
    const response = {
      id: data.id,
      total: data.total || 0,
      result: (data.result || []).slice(0, 100), // Limit to first 100 results
      inexact: data.inexact || false
    }

    console.log(`[trade/search] Success: ${response.total} results, returning ${response.result.length}`)
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('[trade/search] Exception:', error)
    return NextResponse.json({
      error: 'internal_error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
