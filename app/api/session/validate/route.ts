import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { sessionId, league } = await req.json()
    
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    // Use provided league or fallback to current league
    const testLeague = league || "Mercenaries"

    console.log(`[session/validate] Testing session for league: ${testLeague}`)

    // Test the session ID by making a simple trade API call
    const testBody = {
      query: {
        status: { option: "online" },
        stats: [{ type: "and", filters: [] }]
      }
    }

    // Try with enhanced headers similar to what browsers send
    const res = await fetch(`https://www.pathofexile.com/api/trade/search/${encodeURIComponent(testLeague)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Cookie': `POESESSID=${sessionId}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Referer': `https://www.pathofexile.com/trade/search/${encodeURIComponent(testLeague)}`,
        'Origin': 'https://www.pathofexile.com'
      },
      body: JSON.stringify(testBody.query)
    })

    const responseText = await res.text()
    console.log(`[session/validate] Response ${res.status}: ${responseText.substring(0, 200)}`)

    if (res.ok) {
      return NextResponse.json({ 
        valid: true, 
        message: `Session ID is working for league: ${testLeague}` 
      })
    } else {
      // Provide more detailed error information
      let errorDetails = `Status: ${res.status}`
      if (responseText) {
        errorDetails += ` | Response: ${responseText.substring(0, 100)}`
      }
      
      return NextResponse.json({ 
        valid: false, 
        status: res.status,
        message: `Trade API returned ${res.status} for league: ${testLeague}`,
        details: errorDetails,
        sessionIdLength: sessionId.length,
        sessionIdPreview: sessionId.substring(0, 8) + '...'
      })
    }
  } catch (error) {
    console.error('[session/validate] Error:', error)
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
