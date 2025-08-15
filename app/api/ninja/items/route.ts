export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

interface CacheEntry { data: any; ts: number }
const TTL_MS = 60 * 1000
const cache: Map<string, CacheEntry> = (globalThis as any).__NINJA_ITEM_CACHE__ || new Map()
;(globalThis as any).__NINJA_ITEM_CACHE__ = cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get('league') || 'Mercenaries'
  const type = searchParams.get('type') || 'UniqueWeapon'
  const key = `${league}:${type}`
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && now - cached.ts < TTL_MS) {
    return NextResponse.json({ ...cached.data, _cached: true, _cachedAt: cached.ts })
  }
  const upstream = `https://poe.ninja/api/data/itemoverview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}&language=en`
  try {
    const res = await fetch(upstream, { headers: { 'User-Agent': 'poetoybocs/1.0 (+items)' }, cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: 'upstream_error', status: res.status }, { status: 502 })
    const json = await res.json()
    cache.set(key, { data: json, ts: now })
    return NextResponse.json({ ...json, _fetchedAt: now })
  } catch (e:any) {
    return NextResponse.json({ error: 'fetch_failed', message: e?.message }, { status: 500 })
  }
}
