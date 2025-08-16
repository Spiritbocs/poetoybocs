import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { league } = await req.json()
    
    // We cannot directly get a fresh session server-side because PoE requires interactive login
    // Instead, provide instructions for getting a fresh session
    
    return NextResponse.json({
      success: false,
      message: 'Fresh session required',
      instructions: [
        '1. Open Path of Exile Trade in a new tab',
        '2. Login with your credentials', 
        '3. Press F12 → Application → Cookies',
        '4. Find POESESSID and copy the value',
        '5. Paste it in the session field'
      ],
      loginUrl: `https://www.pathofexile.com/trade/search/${encodeURIComponent(league || 'Mercenaries')}`
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}