import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test the trade search with a simple query
    const testBody = {
      league: "Settlers",
      query: {
        status: { option: "online" },
        stats: [{
          type: "and",
          filters: []
        }]
      }
    }

    const res = await fetch('https://poetoybocs.vercel.app/api/trade/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBody)
    })

    const text = await res.text()
    let parsed = null
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      // keep as text
    }

    return NextResponse.json({
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: parsed || text,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    })
  }
}
