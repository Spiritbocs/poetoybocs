export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// Proxy to poeprices.info ML-based pricing service
// Using their form submission endpoint
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.itemText) {
      return NextResponse.json({ error: 'missing_item_text' }, { status: 400 })
    }

    const { itemText, league = 'Mercenaries' } = body

    // Prepare form data to match poeprices.info requirements
    const formData = new FormData()
    formData.append('itemtext', itemText)
    formData.append('league', league)
    formData.append('language', 'en')

    // Send request to poeprices.info
    async function call(): Promise<Response> {
      return fetch('https://www.poeprices.info/api', {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'poetoybocs/1.0 (price-prediction-proxy)'
        }
      })
    }
    let response = await call()
    if (!response.ok && response.status >= 500) {
      // brief retry once on 5xx
      await new Promise(r=> setTimeout(r, 500))
      response = await call()
    }
    if (!response.ok) {
      return NextResponse.json({ error: 'upstream_error', status: response.status }, { status: 502 })
    }
    let result: any = null
    try { result = await response.json() } catch (e) { return NextResponse.json({ error:'invalid_upstream_json' }, { status:502 }) }
    // Map known poeprices error codes to descriptive messages
    if (result && typeof result.error === 'number' && result.error !== 0) {
      const code = result.error
      const map: Record<number,string> = {
        1: 'Service overloaded, try again shortly',
        2: 'Unsupported or invalid item text',
        3: 'League unsupported',
        4: 'Rate limited – slow down',
        5: 'Prediction unavailable for this item (insufficient similar data)',
        6: 'Internal model error'
      }
      return NextResponse.json({ error: 'poeprices_error', code, message: map[code] || 'Unknown poeprices error' }, { status: 200 })
    }
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in poeprices proxy:', error)
    return NextResponse.json(
      { error: 'proxy_error', message: error?.message },
      { status: 500 }
    )
  }
}
