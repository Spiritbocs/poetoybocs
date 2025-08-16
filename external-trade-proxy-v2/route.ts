// Simple external proxy fallback for trade searches
// This can be deployed on a different service (Railway, Render, etc.) to get a different IP range

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body || !body.league || !body.query) {
      return Response.json({ error: 'invalid_request' }, { status: 400 })
    }

    const { league, query } = body
    const upstream = `https://www.pathofexile.com/api/trade/search/${encodeURIComponent(league)}`

    const response = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://www.pathofexile.com',
        'Referer': `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        // Add CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(query),
    })

    if (!response.ok) {
      const text = await response.text()
      return Response.json({
        error: 'upstream_error',
        status: response.status,
        statusText: response.statusText,
        body: text.slice(0, 1000)
      }, { status: response.status })
    }

    const json = await response.json()
    const result: string[] = Array.isArray(json?.result) ? json.result.slice(0, 100) : []
    
    return Response.json({ 
      id: json?.id, 
      total: json?.total ?? 0, 
      result 
    })

  } catch (e: any) {
    return Response.json({ error: 'proxy_failure', message: e?.message }, { status: 500 })
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
