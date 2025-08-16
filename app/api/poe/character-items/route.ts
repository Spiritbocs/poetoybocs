// Server-side proxy to fetch a character's items (equipment + inventory subset) from PoE API.
// Requires bearer token (OAuth) and character name. Optionally accountName; if omitted we try to resolve via /profile.
// Endpoint: /api/poe/character-items?character=CharName
// (accountName will be inferred). We attempt multiple upstream variants for resilience.

export const dynamic = 'force-dynamic'

interface UpstreamItem {
  id: string
  name: string
  typeLine: string
  icon: string
  w: number
  h: number
  inventoryId: string
  frameType: number
  ilvl?: number
  league?: string
  identified?: boolean
  corrupted?: boolean
  properties?: any[]
  requirements?: any[]
  implicitMods?: string[]
  explicitMods?: string[]
  enchantMods?: string[]
  craftedMods?: string[]
  fracturedMods?: string[]
  sockets?: Array<{ group: number; attr?: string; sColour?: string; colour?: string; socket?: number; groupColor?: string }>
  socketedItems?: UpstreamItem[]
  note?: string
  x?: number
  y?: number
}

interface SimplifiedItem {
  id: string
  name: string
  typeLine: string
  icon: string
  inventoryId: string
  frameType: number
  w: number
  h: number
  sockets?: Array<{ group: number; colour: string }>
  socketedItems?: Array<{ id: string; name: string; typeLine: string; icon: string; support?: boolean }>
  properties?: Array<{ name: string; values: any[] }>
  implicitMods?: string[]
  explicitMods?: string[]
  craftedMods?: string[]
  enchantMods?: string[]
  fracturedMods?: string[]
  ilvl?: number
  corrupted?: boolean
  note?: string
}

const memoryCache: Map<string, { ts: number; data: SimplifiedItem[] }> = new Map()
const TTL_MS = 30 * 1000

async function fetchProfile(token: string, headers: Record<string,string>) {
  try {
    const r = await fetch('https://api.pathofexile.com/profile', { headers, cache: 'no-store' })
    if (r.ok) return await r.json()
  } catch {}
  return null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const character = searchParams.get('character') || searchParams.get('name')
    const accountName = searchParams.get('accountName')
    if (!character) {
      return Response.json({ error: 'missing_character' }, { status: 400 })
    }
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'missing_token' }, { status: 401 })
    }
    const token = authHeader.slice('Bearer '.length).trim()
    const cacheKey = token + '::' + character
    const cached = memoryCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < TTL_MS) {
      return Response.json({ items: cached.data, cached: true })
    }
    const upstreamHeaders: Record<string,string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'User-Agent': 'poetoybocs/1.0 (character-items-proxy)',
      'Cache-Control': 'no-cache'
    }
    let acct = accountName
    if (!acct) {
      const profile = await fetchProfile(token, upstreamHeaders)
      acct = profile?.name || undefined
    }
    const qs = new URLSearchParams({ character })
    if (acct) qs.set('accountName', acct)
    const urls = [
      `https://api.pathofexile.com/character-window/get-items?${qs.toString()}`,
      `https://www.pathofexile.com/character-window/get-items?${qs.toString()}`,
    ]
    let items: UpstreamItem[] | null = null
    let lastStatus: number | null = null
    for (const url of urls) {
      try {
        const r = await fetch(url, { headers: upstreamHeaders, cache: 'no-store' })
        lastStatus = r.status
        if (!r.ok) continue
        const json = await r.json()
        if (Array.isArray(json?.items)) { items = json.items; break }
      } catch {/* continue */}
    }
    if (!items) {
      return Response.json({ error: 'items_unavailable', lastStatus }, { status: 502 })
    }
    const simplified: SimplifiedItem[] = items.map(it => ({
      id: it.id,
      name: it.name,
      typeLine: it.typeLine,
      icon: it.icon,
      inventoryId: it.inventoryId,
      frameType: it.frameType,
      w: it.w,
      h: it.h,
      sockets: it.sockets?.map(s => ({ group: s.group, colour: (s.colour || s.sColour || '').toLowerCase() })),
      socketedItems: it.socketedItems?.map(g => ({ id: g.id, name: g.name, typeLine: g.typeLine, icon: g.icon, support: /Support/.test(g.typeLine) })),
      properties: it.properties?.map(p => ({ name: p.name, values: p.values })),
      implicitMods: it.implicitMods,
      explicitMods: it.explicitMods,
      craftedMods: it.craftedMods,
      enchantMods: it.enchantMods,
      fracturedMods: it.fracturedMods,
      ilvl: it.ilvl,
      corrupted: it.corrupted,
      note: it.note,
    }))
    memoryCache.set(cacheKey, { ts: Date.now(), data: simplified })
    return Response.json({ items: simplified, cached: false })
  } catch (e: any) {
    return Response.json({ error: 'server_error', message: e?.message }, { status: 500 })
  }
}
