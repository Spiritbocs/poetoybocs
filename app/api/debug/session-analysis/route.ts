import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test multiple session sources
    const envSessionId = process.env.POE_TRADE_SESSION_ID
    const testSessions = [
      { source: 'environment', id: envSessionId },
      { source: 'user_old', id: 'bf5054492847477589d226b7ed59c931' },
      { source: 'user_new', id: '1b2fb02e63633f4f19aee1c49566dfff98' }
    ]

    const results = []

    for (const session of testSessions) {
      if (!session.id) {
        results.push({ ...session, status: 'missing', error: 'No session ID' })
        continue
      }

      try {
        const testRes = await fetch('https://www.pathofexile.com/api/trade/search/Mercenaries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `POESESSID=${session.id}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify({
            query: {
              status: { option: "online" },
              stats: [{ type: "and", filters: [] }]
            }
          })
        })

        const responseText = await testRes.text().catch(() => 'Unable to read response')
        
        results.push({
          ...session,
          status: testRes.status,
          statusText: testRes.statusText,
          ok: testRes.ok,
          responsePreview: responseText.substring(0, 200)
        })
      } catch (error) {
        results.push({
          ...session,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      results,
      analysis: {
        workingSessions: results.filter(r => 'ok' in r && r.ok).length,
        failedSessions: results.filter(r => 'ok' in r && !r.ok).length,
        missingSessions: results.filter(r => r.status === 'missing').length
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
