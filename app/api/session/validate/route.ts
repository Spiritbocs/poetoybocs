import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json()
    
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    // Test the session ID by making a simple trade API call
    const testBody = {
      league: "Settlers",
      query: {
        status: { option: "online" },
        stats: [{ type: "and", filters: [] }]
      }
    }

    const res = await fetch(`https://www.pathofexile.com/api/trade/search/Mercenaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `POESESSID=${sessionId}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(testBody.query)
    })

    if (res.ok) {
      return NextResponse.json({ 
        valid: true, 
        message: 'Session ID is working' 
      })
    } else {
      return NextResponse.json({ 
        valid: false, 
        status: res.status,
        message: `Trade API returned ${res.status}` 
      })
    }
  } catch (error) {
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
