// Server-side proxy for fetching Path of Exile characters.
// Accepts Bearer token from client (already obtained via OAuth PKCE) and
// queries several upstream endpoints, normalizing the result to a minimal array.
// Caches per-token briefly to reduce upstream load.

export const dynamic = 'force-dynamic'

const memoryCache: Map<string, { ts: number; data: any[] }> = new Map()
const TTL_MS = 60 * 1000 // 1 minute cache per token

async function fetchProfile(token: string, headers: Record<string,string>) {
  try {
    const r = await fetch('https://api.pathofexile.com/profile', { headers, cache: 'no-store' })
    if (r.ok) {
      return await r.json()
    }
  } catch {}
  return null
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'missing_token' }, { status: 401 })
    }
    const token = authHeader.slice('Bearer '.length).trim()
    if (!token) return Response.json({ error: 'invalid_token' }, { status: 401 })

    const cached = memoryCache.get(token)
    if (cached && Date.now() - cached.ts < TTL_MS) {
      return Response.json({ characters: cached.data, cached: true })
    }

    const upstreamHeaders: Record<string,string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'User-Agent': 'poetoybocs/1.0 (characters-proxy)',
      'Cache-Control': 'no-cache'
    }

    const profile = await fetchProfile(token, upstreamHeaders)
    const accountName = profile?.name
    const qs = accountName ? `?accountName=${encodeURIComponent(accountName)}` : ''
    const endpoints = [
      `https://api.pathofexile.com/character-window/get-characters${qs}`,
      `https://www.pathofexile.com/character-window/get-characters${qs}`,
      `https://api.pathofexile.com/profile/characters${qs}`,
    ]

    let characters: any[] | null = null
    let lastStatus: number | null = null
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: upstreamHeaders, cache: 'no-store' })
        lastStatus = res.status
        if (!res.ok) continue
        const json = await res.json()
        if (Array.isArray(json)) { characters = json; break }
        if (Array.isArray(json?.characters)) { characters = json.characters; break }
      } catch {/* swallow and continue */}
    }

    if (!characters) {
      return Response.json({ error: 'characters_unavailable', lastStatus }, { status: 502 })
    }

    const simplified = characters.map(c => ({
      name: c.name,
      level: c.level,
      class: c.class || c.baseClass || 'Unknown',
      classId: c.classId,
      league: c.league,
      ascendancyClass: c.ascendancyClass,
      lastActive: c.lastActive,
    }))

    memoryCache.set(token, { ts: Date.now(), data: simplified })
    return Response.json({ characters: simplified, cached: false })
  } catch (e: any) {
    return Response.json({ error: 'server_error', message: e?.message }, { status: 500 })
  }
}
