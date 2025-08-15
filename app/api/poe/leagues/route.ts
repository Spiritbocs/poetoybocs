import { NextResponse } from 'next/server'

// Simple in-memory cache
const cache: Record<string, { data: any; ts: number }> = {}
const TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const realm = searchParams.get('realm') || 'pc'
  const cacheKey = realm
  const now = Date.now()
  const cached = cache[cacheKey]
  if (cached && now - cached.ts < TTL) {
    return NextResponse.json(cached.data, { headers: corsHeaders() })
  }
  // Official docs: /league returns leagues; omit type to retrieve broader set (main + historical/event where available)
  const base = `https://api.pathofexile.com/league?realm=${encodeURIComponent(realm)}`
  const all: any[] = []
  let offset = 0
  const pageLimit = 50
  // Paginate defensively (max 4 pages) even though main normally caps at 50
  while (offset < 200) {
    const url = `${base}&limit=${pageLimit}&offset=${offset}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'poetoybocs/1.0 (+https://poetoybocs.vercel.app)',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    })
    if (!res.ok) {
      return NextResponse.json({ error: `upstream ${res.status}` }, { status: res.status, headers: corsHeaders() })
    }
    const data = await res.json()
    if (Array.isArray(data)) all.push(...data)
    if (!Array.isArray(data) || data.length < pageLimit) break
    offset += pageLimit
  }

  // Deduplicate (keep first occurrence)
  const dedup: any[] = []
  const seen = new Set<string>()
  for (const l of all) { if (!seen.has(l.id)) { seen.add(l.id); dedup.push(l) } }
  cache[cacheKey] = { data: dedup, ts: now }
  return NextResponse.json(dedup, { headers: corsHeaders() })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}
