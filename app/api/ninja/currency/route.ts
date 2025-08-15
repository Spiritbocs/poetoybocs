import { NextResponse } from "next/server"

// Simple in-memory cache (per server instance)
interface CacheEntry { data: any; timestamp: number }
const CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes
const globalCache: Map<string, CacheEntry> = (globalThis as any).__NINJA_CACHE__ || new Map()
;(globalThis as any).__NINJA_CACHE__ = globalCache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get("league") || "Mercenaries"
  const type = searchParams.get("type") || "Currency"
  const cacheKey = `${league}:${type}`

  const cached = globalCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, { headers: corsHeaders() })
  }

  const upstreamUrl = `https://poe.ninja/api/data/currencyoverview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`

  try {
    const res = await fetch(upstreamUrl, {
      headers: { "User-Agent": "poetoybocs/1.0 (+github)" },
      next: { revalidate: CACHE_TTL_MS / 1000 },
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream error ${res.status}` },
        { status: res.status, headers: corsHeaders() },
      )
    }
    const data = await res.json()
    globalCache.set(cacheKey, { data, timestamp: Date.now() })
    return NextResponse.json(data, { headers: corsHeaders() })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Fetch failed" },
      { status: 500, headers: corsHeaders() },
    )
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  }
}

export function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders() })
}
