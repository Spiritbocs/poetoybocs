import { NextRequest } from 'next/server'

const cache = new Map<string, { data: any; timestamp: number }>()
const TTL = 1000 * 60 * 2 // 2 minutes

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const league = searchParams.get('league') || 'Mercenaries'
  const type = searchParams.get('type') || 'UniqueWeapon'
  const key = `${league}:${type}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < TTL) {
    return new Response(JSON.stringify(cached.data), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    })
  }
  try {
    const upstream = `https://poe.ninja/api/data/itemoverview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`
    const res = await fetch(upstream, { next: { revalidate: 120 } })
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'upstream_error', status: res.status }), { status: 500 })
    }
    const json = await res.json()
    cache.set(key, { data: json, timestamp: Date.now() })
    return new Response(JSON.stringify(json), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'fetch_failed' }), { status: 500 })
  }
}
