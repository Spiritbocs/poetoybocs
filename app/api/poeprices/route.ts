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
    const response = await fetch('https://www.poeprices.info/api', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'poetoybocs/1.0 (price-prediction-proxy)'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'upstream_error', status: response.status },
        { status: 502 }
      )
    }

    // Parse and return their JSON response
    const result = await response.json()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in poeprices proxy:', error)
    return NextResponse.json(
      { error: 'proxy_error', message: error?.message },
      { status: 500 }
    )
  }
}
