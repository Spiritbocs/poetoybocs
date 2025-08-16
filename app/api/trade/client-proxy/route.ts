export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.league || !body.query) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const { league, query, userAgent, cookies } = body

    // This endpoint just validates the request structure and returns instructions
    // The actual trade API call will be made client-side to avoid IP blocking
    
    return NextResponse.json({
      success: true,
      message: 'Request structure valid',
      instructions: {
        method: 'POST',
        url: `https://www.pathofexile.com/api/trade/search/${encodeURIComponent(league)}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': cookies || ''
        },
        body: JSON.stringify(query)
      },
      fallbackStrategy: 'client_direct'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'internal_error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
