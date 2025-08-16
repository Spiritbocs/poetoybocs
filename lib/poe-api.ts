// Path of Exile API integration layer
export interface League {
  id: string
  realm?: string
  description?: string
  category?: {
    id: string
    current?: boolean
  }
  rules?: Array<{
    id: string
    name: string
    description?: string
  }>
  startAt?: string
  endAt?: string
  url?: string
}

export interface CurrencyData {
  currencyTypeName: string
  icon?: string
  pay?: {
    id: number
    league_id: number
    pay_currency_id: number
    get_currency_id: number
    sample_time_utc: string
    count: number
    value: number
    data_point_count: number
    includes_secondary: boolean
  }
  receive?: {
    id: number
    league_id: number
    pay_currency_id: number
    get_currency_id: number
    sample_time_utc: string
    count: number
    value: number
    data_point_count: number
    includes_secondary: boolean
  }
  paySparkLine?: {
    data: number[]
    totalChange: number
  }
  receiveSparkLine?: {
    data: number[]
    totalChange: number
  }
  chaosEquivalent?: number
  lowConfidencePaySparkLine?: {
    data: number[]
    totalChange: number
  }
  lowConfidenceReceiveSparkLine?: {
    data: number[]
    totalChange: number
  }
  detailsId: string
  divineEquivalent?: number
}

export interface TradeSearchResult {
  id: string
  result: string[]
  total: number
}

export interface TradeItem {
  id: string
  listing: {
    method: string
    indexed: string
    stash: {
      name: string
      x: number
      y: number
    }
    whisper: string
    account: {
      name: string
      online?: {
        league: string
      }
      lastCharacterName: string
    }
    price?: {
      type: string
      amount: number
      currency: string
    }
  }
  item: {
    verified: boolean
    w: number
    h: number
    icon: string
    league: string
    id: string
    name: string
    typeLine: string
    baseType: string
    rarity: string
    identified: boolean
    ilvl: number
    note?: string
    properties?: Array<{
      name: string
      values: Array<[string, number]>
      displayMode?: number
      type?: number
    }>
    requirements?: Array<{
      name: string
      values: Array<[string, number]>
      displayMode?: number
    }>
    implicitMods?: string[]
    explicitMods?: string[]
    craftedMods?: string[]
    enchantMods?: string[]
    fracturedMods?: string[]
    corrupted?: boolean
    unidentified?: boolean
    duplicated?: boolean
    split?: boolean
    frameType: number
    x: number
    y: number
    inventoryId: string
  }
}

interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

interface AuthToken {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

interface PKCEData {
  codeVerifier: string
  codeChallenge: string
  state: string
}

interface AccountProfile {
  name?: string
  uuid?: string
  realm?: string
  guild?: {
    name?: string
    tag?: string
  }
  // Other fields from PoE profile can be added as needed
}

// Character data structure (subset of PoE API response fields)
interface CharacterSummary {
  name: string
  level: number
  class: string
  classId?: number
  league?: string
  ascendancyClass?: number
  lastActive?: string
}
export type { CharacterSummary }

// Simple global rate limiter state for trade endpoints
let tradeLastSearchAt = 0
let tradeLastFetchAt = 0
let tradeMinSearchInterval = 350 // ms between /search calls (adaptive)
let tradeMinFetchInterval = 250  // ms between /fetch calls (adaptive)
let globalRateLimitUntil = 0     // epoch ms until which we should not hit upstream
let lastRateLimitSeconds = 0

function sleep(ms:number) { return new Promise(res=> setTimeout(res, ms)) }

class PoEAPI {
  private baseUrl = "https://api.pathofexile.com"
  private tradeUrl = "https://www.pathofexile.com/api/trade"
  private ninjaUrl = "https://poe.ninja/api/data"
  private oauthBaseUrl = "https://www.pathofexile.com"

private oauthConfig: OAuthConfig = {
  clientId: process.env.NEXT_PUBLIC_POE_CLIENT_ID || "",
  clientSecret: process.env.POE_CLIENT_SECRET || "",
  redirectUri: process.env.NEXT_PUBLIC_POE_REDIRECT_URI || "",
  scopes: ["account:profile", "account:characters"],
}

  // Cache for API responses
  private cache = new Map<string, { data: any; timestamp: number }>()
  private cacheTimeout = 10 * 60 * 1000 // 10 minutes (align with desired currency refresh cadence)

  private authToken: AuthToken | null = null
  private profile: AccountProfile | null = null
  private characters: CharacterSummary[] | null = null
  private selectedCharacter: CharacterSummary | null = null

  private ascendancyIconMap: Record<string, string> = {
    // Mapping of ascendancy names to PoE Wiki avatar images
    // (These are stable file names; adjust if any 404.)
    Ascendant: "https://www.poewiki.net/images/5/59/Ascendant_avatar.png",
    Slayer: "https://www.poewiki.net/images/4/4a/Slayer_avatar.png",
    Gladiator: "https://www.poewiki.net/images/8/8b/Gladiator_avatar.png",
    Champion: "https://www.poewiki.net/images/2/27/Champion_avatar.png",
    Assassin: "https://www.poewiki.net/images/2/26/Assassin_avatar.png",
    Saboteur: "https://www.poewiki.net/images/9/93/Saboteur_avatar.png",
    Trickster: "https://www.poewiki.net/images/2/23/Trickster_avatar.png",
    Juggernaut: "https://www.poewiki.net/images/f/fd/Juggernaut_avatar.png",
    Berserker: "https://www.poewiki.net/images/a/a7/Berserker_avatar.png",
    Chieftain: "https://www.poewiki.net/images/6/62/Chieftain_avatar.png",
    Necromancer: "https://www.poewiki.net/images/7/7f/Necromancer_avatar.png",
    Occultist: "https://www.poewiki.net/images/a/ab/Occultist_avatar.png",
    Elementalist: "https://www.poewiki.net/images/7/7e/Elementalist_avatar.png",
    Deadeye: "https://www.poewiki.net/images/3/38/Deadeye_avatar.png",
    Raider: "https://www.poewiki.net/images/f/f1/Raider_avatar.png",
    Pathfinder: "https://www.poewiki.net/images/1/1c/Pathfinder_avatar.png",
    Inquisitor: "https://www.poewiki.net/images/1/17/Inquisitor_avatar.png",
    Hierophant: "https://www.poewiki.net/images/7/7d/Hierophant_avatar.png",
    Guardian: "https://www.poewiki.net/images/6/6f/Guardian_avatar.png",
    RaiderPlaceholder: "https://www.poewiki.net/images/3/38/Deadeye_avatar.png", // example fallback
    TricksterPlaceholder: "https://www.poewiki.net/images/2/23/Trickster_avatar.png",
  }

  private generateCodeVerifier(): string {
    const toB64Url = (buf: Uint8Array) =>
      btoa(String.fromCharCode.apply(null, Array.from(buf)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "")

    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint8Array(32)
        crypto.getRandomValues(array)
        return toB64Url(array)
      }
    } catch {/* fall back */}

    // Node / Electron fallback
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeCrypto = require('crypto') as typeof import('crypto')
      const buf: Buffer = nodeCrypto.randomBytes(32)
      return toB64Url(new Uint8Array(buf))
    } catch {/* ignore */}

    // Ultimate fallback (insecure for PKCE but better than breaking login)
    const fallback = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
    return toB64Url(new Uint8Array(fallback))
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const toB64Url = (bytes: Uint8Array) =>
      btoa(String.fromCharCode.apply(null, Array.from(bytes)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "")

    // Browser WebCrypto path
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
        const encoder = new TextEncoder()
        const data = encoder.encode(verifier)
        const digest = await crypto.subtle.digest('SHA-256', data)
        return toB64Url(new Uint8Array(digest))
      }
    } catch {/* continue to fallback */}

    // Node / Electron fallback using built-in crypto
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeCrypto = require('crypto') as typeof import('crypto')
      const hash = nodeCrypto.createHash('sha256').update(verifier).digest()
      return toB64Url(new Uint8Array(hash))
    } catch {/* ignore */}

    // Last resort: return verifier (not ideal but avoids crash)
    return verifier
  }

  async getAuthUrl(): Promise<string> {
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = await this.generateCodeChallenge(codeVerifier)
    const state = Math.random().toString(36).substring(7)
  // Determine redirect URI (env or current origin fallback for local dev)
  const redirectUri = this.oauthConfig.redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/oauth/callback` : '')

    console.log("[getAuthUrl] OAuth config:", {
      clientId: this.oauthConfig.clientId?.substring(0, 5) + "...",
      redirectUri,
      state,
      origin: typeof window !== 'undefined' ? window.location.origin : 'server'
    })

    // Store PKCE data keyed by state to avoid race if multiple auth attempts start
    if (typeof window !== "undefined") {
      try {
        const key = `poe_pkce_data_${state}`
        const pkceData = { codeVerifier, codeChallenge, state, ts: Date.now() }
        localStorage.setItem(key, JSON.stringify(pkceData))
        console.log("[getAuthUrl] PKCE data stored:", { key, verifierLength: codeVerifier.length })
        // Maintain an index for cleanup
        const idxRaw = localStorage.getItem('poe_pkce_index')
        const idx: string[] = idxRaw ? JSON.parse(idxRaw) : []
        idx.push(key)
        // Prune old (older than 10 minutes or keep last 5)
        while (idx.length > 8) idx.shift()
        localStorage.setItem('poe_pkce_index', JSON.stringify(idx))
      } catch (e) {
        console.error("[getAuthUrl] Failed to store PKCE data:", e)
        /* ignore storage errors */
      }
    }

    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      response_type: "code",
      scope: this.oauthConfig.scopes.join(" "),
      redirect_uri: redirectUri,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "consent",
    })

    const full = `${this.oauthBaseUrl}/oauth/authorize?${params.toString()}`
    // If running inside Electron with popup helper, perform the flow immediately and exchange token
    // This avoids navigation away & can bypass CF issues by isolating login window.
    if (typeof window !== 'undefined' && (window as any).poeApp?.oauthOpen) {
      try {
        const result = await (window as any).poeApp.oauthOpen(full)
        if (result && result.code && result.state) {
          await this.exchangeCodeForToken(result.code, result.state)
          return '' // indicates handled
        }
      } catch (e) {
        console.warn('Electron oauth popup failed, falling back to redirect', (e as any)?.message)
      }
    }
    return full
  }

  async exchangeCodeForToken(code: string, state: string): Promise<AuthToken> {
    try {
      console.log("[exchangeCodeForToken] Starting token exchange:", { codePrefix: code.substring(0, 8), state })
      // Retrieve PKCE data
      let pkceData: PKCEData | null = null
      if (typeof window !== "undefined") {
        try {
          const key = `poe_pkce_data_${state}`
          const stored = localStorage.getItem(key)
          console.log("[exchangeCodeForToken] Looking for PKCE data:", { key, found: !!stored })
          if (stored) {
            pkceData = JSON.parse(stored)
            localStorage.removeItem(key)
            console.log("[exchangeCodeForToken] PKCE data retrieved and removed")
          } else {
            // Try fallback legacy key (pre multi-state implementation)
            const legacy = localStorage.getItem('poe_pkce_data')
            console.log("[exchangeCodeForToken] Checking legacy PKCE data:", { found: !!legacy })
            if (legacy) {
              const parsed = JSON.parse(legacy)
              if (parsed.state === state) {
                pkceData = parsed
                console.log("[exchangeCodeForToken] Legacy PKCE data matched")
              }
              localStorage.removeItem('poe_pkce_data')
            }
          }
        } catch (e) {
          console.error("[exchangeCodeForToken] Error retrieving PKCE data:", e)
          /* ignore */
        }
      }

      if (!pkceData || pkceData.state !== state || !pkceData.codeVerifier) {
        throw new Error("Invalid OAuth state or missing PKCE data")
      }

      const response = await fetch("/api/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          state: state,
          codeVerifier: pkceData.codeVerifier,
        }),
      })

      if (!response.ok) {
        let errorData: any = {}
        try { errorData = await response.json() } catch { /* ignore */ }
        console.error("OAuth token exchange error:", response.status, errorData)
        const desc = errorData.error_description || errorData.error || 'unknown_error'
        throw new Error(`OAuth token exchange failed: ${response.status} - ${desc}`)
      }

      const token = await response.json()
      this.authToken = token
      console.log("[exchangeCodeForToken] Token received and set:", { hasToken: !!token, tokenType: token?.token_type })

      // Store in localStorage for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("poe_auth_token", JSON.stringify(token))
        console.log("[exchangeCodeForToken] Token stored in localStorage")
      }

      return token
    } catch (error) {
      console.error("Error exchanging code for token:", error)
      throw error
    }
  }

  loadStoredToken(): boolean {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("poe_auth_token")
      if (stored) {
        try {
          this.authToken = JSON.parse(stored)
          // Attempt to load cached profile too
          const prof = localStorage.getItem("poe_profile")
          if (prof) {
            try { this.profile = JSON.parse(prof) } catch { localStorage.removeItem("poe_profile") }
          }
          return true
        } catch (error) {
          console.error("Error loading stored token:", error)
          localStorage.removeItem("poe_auth_token")
        }
      }
    }
    return false
  }

  isAuthenticated(): boolean {
    return this.authToken !== null
  }

  logout(): void {
    this.authToken = null
    this.profile = null
    this.characters = null
    this.selectedCharacter = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("poe_auth_token")
      localStorage.removeItem("poe_profile")
      localStorage.removeItem("poe_characters")
      localStorage.removeItem("poe_selected_character")
    }
  }

  getCachedProfile(): AccountProfile | null {
    return this.profile
  }

  async getProfile(force = false): Promise<AccountProfile | null> {
    if (!this.authToken) return null
    if (this.profile && !force) return this.profile
    try {
      const res = await this.makeAuthenticatedRequest("/profile")
      if (!res.ok) {
        if (res.status === 401) {
          console.warn("Unauthorized fetching profile – token may be invalid/expired")
        } else {
          console.warn("Profile fetch failed", res.status, res.statusText)
        }
        return null
      }
      const data: AccountProfile = await res.json()
      this.profile = data
      if (typeof window !== "undefined") {
        try { localStorage.setItem("poe_profile", JSON.stringify(data)) } catch {}
      }
      return data
    } catch (e) {
      console.error("Error fetching profile", e)
      return null
    }
  }

  async getCharacters(force = false): Promise<CharacterSummary[] | null> {
    if (!this.authToken) return null
    if (this.characters && !force) return this.characters
    try {
      const res = await fetch('/api/poe/characters', {
        headers: { Authorization: this.authToken ? `Bearer ${this.authToken.access_token}` : '' },
        cache: 'no-store'
      })
      if (!res.ok) {
        console.warn('Characters proxy non-ok', res.status)
        return null
      }
      const json = await res.json()
      const data = Array.isArray(json.characters) ? json.characters : []
      this.characters = data.map((c: any): CharacterSummary => ({
        name: c.name,
        level: c.level,
        class: c.class || c.baseClass || 'Unknown',
        classId: c.classId,
        league: c.league,
        ascendancyClass: c.ascendancyClass,
        lastActive: c.lastActive,
      }))
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('poe_characters', JSON.stringify(this.characters)) } catch {}
      }
      if (!this.selectedCharacter && this.characters && this.characters.length) {
        const persisted = typeof window !== 'undefined' ? localStorage.getItem('poe_selected_character') : null
        if (persisted) {
          const found = this.characters?.find(c=>c.name===persisted)
          this.selectedCharacter = found || (this.characters ? this.characters[0] : null)
        } else {
          this.selectedCharacter = this.characters ? this.characters[0] : null
        }
      }
      return this.characters
    } catch (e) {
      console.error('Error fetching characters', e)
      return null
    }
  }

  getCachedCharacters(): CharacterSummary[] | null {
    if (this.characters) return this.characters
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('poe_characters')
      if (stored) {
        try { this.characters = JSON.parse(stored) } catch { localStorage.removeItem('poe_characters') }
      }
    }
    return this.characters
  }

  getSelectedCharacter(): CharacterSummary | null {
    return this.selectedCharacter
  }

  setSelectedCharacter(name: string) {
    if (!this.characters) return
    const found = this.characters.find(c=>c.name===name)
    if (found) {
      this.selectedCharacter = found
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('poe_selected_character', found.name) } catch {}
      }
    }
  }

  getAscendancyIcon(ascName: string | undefined): string | null {
    if (!ascName) return null
    return this.ascendancyIconMap[ascName] || null
  }

  private async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      ...options.headers,
      Authorization: this.authToken ? `Bearer ${this.authToken.access_token}` : "",
    }

    return fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })
  }

  async getLeagues(realm = "pc"): Promise<League[]> {
    const cacheKey = `leagues-${realm}`
    const cached = this.getCachedData<League[]>(cacheKey)
    if (cached) return cached

  const url = `/api/poe/leagues?realm=${encodeURIComponent(realm)}`
    try {
  const res = await fetch(url)
  if (!res.ok) {
        console.warn('Leagues fetch non-ok status', res.status)
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      const now = Date.now()
      const leagues: League[] = (Array.isArray(json) ? json : []).map((l: any): League => {
        const end = l.endAt ? Date.parse(l.endAt) : null
        const start = l.startAt ? Date.parse(l.startAt) : null
        const nowIso = Date.now()
        const active = (!start || start <= nowIso) && (!end || end > nowIso)
        // Determine broad category
        let categoryId = 'Challenge'
        if (/^Standard$/i.test(l.id)) categoryId = 'Standard'
        else if (/^Hardcore$/i.test(l.id)) categoryId = 'Hardcore'
        else if (/Hardcore/i.test(l.id)) categoryId = 'Hardcore'
        // current flag only for active non-permanent challenge leagues
        const isPermanent = categoryId === 'Standard' || categoryId === 'Hardcore'
        return {
          id: l.id,
          realm: l.realm || realm,
          description: l.description,
          startAt: l.startAt,
          endAt: l.endAt,
          url: l.url,
          rules: l.rules,
          category: { id: categoryId, current: active && !isPermanent },
        }
      })

      // Include Standard/Hardcore if missing (API may omit if limit reached)
      const ensure = (id: string) => {
        if (!leagues.find(l => l.id === id)) {
          leagues.unshift({ id, description: `${id} League`, category: { id, current: true } })
        }
      }
      ensure('Standard')
      ensure('Hardcore')

      // Sort: core leagues first (Standard/Hardcore), then active challenge leagues, then previous challenge leagues
      leagues.sort((a,b)=>{
        const aCore = /^(Standard|Hardcore)$/i.test(a.id)
        const bCore = /^(Standard|Hardcore)$/i.test(b.id)
        if (aCore !== bCore) return aCore ? -1 : 1
        if (a.category?.current !== b.category?.current) return a.category?.current ? -1 : 1
        return a.id.localeCompare(b.id)
      })

      this.setCachedData(cacheKey, leagues)
      return leagues
    } catch (e) {
  // Swallow error and provide silent fallback so UI continues
  console.warn('Using fallback leagues due to fetch failure', (e as any)?.message)
      const fallback: League[] = [
        { id: 'Mercenaries', description: 'Current Challenge League', category: { id: 'Challenge', current: true } },
        { id: 'Hardcore Mercenaries', description: 'Current Hardcore Challenge League', category: { id: 'Hardcore', current: true } },
        { id: 'Standard', description: 'Standard League', category: { id: 'Standard', current: true } },
        { id: 'Hardcore', description: 'Hardcore League', category: { id: 'Hardcore', current: true } }
      ]
      this.setCachedData(cacheKey, fallback)
      return fallback
    }
  }

  async getCurrencyData(league: string, type: 'Currency' | 'Fragment' = 'Currency', realm: string = 'pc'): Promise<CurrencyData[]> {
  // Real-time mode: bypass long-lived cache (poe.ninja updates ~1-5m). We rely on server proxy short TTL (45s).
    try {
      // Use internal proxy route to avoid CORS / client direct external issues
      const response = await fetch(
        `/api/ninja/currency?realm=${encodeURIComponent(realm)}&league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`,
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch currency data: HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Map details for icons
      const detailsMap: Record<string, { icon?: string }> = {}
      if (Array.isArray(data.currencyDetails)) {
        for (const det of data.currencyDetails) {
          if (det.name && det.icon) {
            detailsMap[det.name] = { icon: det.icon }
          }
        }
      }

      const divineLine = data.lines.find((l: any) => l.detailsId === 'divine-orb')
      const divineChaos = divineLine?.chaosEquivalent || null

      const currencyData: CurrencyData[] = data.lines.map((line: any) => {
        const icon = detailsMap[line.currencyTypeName]?.icon
        return {
          currencyTypeName: line.currencyTypeName,
          chaosEquivalent: line.chaosEquivalent,
          detailsId: line.detailsId,
            pay: line.pay,
            receive: line.receive,
            paySparkLine: line.paySparkLine,
            receiveSparkLine: line.receiveSparkLine,
            lowConfidencePaySparkLine: line.lowConfidencePaySparkLine,
            lowConfidenceReceiveSparkLine: line.lowConfidenceReceiveSparkLine,
            icon,
            divineEquivalent: divineChaos ? line.chaosEquivalent / divineChaos : undefined,
        }
      })

      return currencyData
    } catch (error) {
  console.error("Error fetching currency data:", error)
  // Provide a minimal fallback instead of throwing so UI can render
  return []
    }
  }

  async getItemOverview(league: string, type: string, realm: string = 'pc'): Promise<any[]> {
    const cacheKey = `itemOverview-${realm}-${league}-${type}`
    const cached = this.getCachedData<any[]>(cacheKey)
    if (cached) return cached
    const attemptFetch = async (t: string): Promise<any[]> => {
      try {
        const res = await fetch(`/api/ninja/items?realm=${encodeURIComponent(realm)}&league=${encodeURIComponent(league)}&type=${encodeURIComponent(t)}`)
        if (!res.ok) {
          console.warn('Item overview upstream not ok', res.status, 'type=', t)
          return []
        }
        const json = await res.json()
        return json.lines || []
      } catch (e) {
        console.error('Item overview fetch failed', e, 'type=', t)
        return []
      }
    }

    // Fallback variants for uncertain poe.ninja naming
    const fallbacks: Record<string,string[]> = {
      UniqueTincture: ['Tincture'],
      Runegraft: ['Runegrafts'],
      AllflameEmber: ['AllflameEmbers'],
      Artifact: ['Artifacts'],
      BaseType: ['Base Types','BaseTypes'],
    }

    let lines = await attemptFetch(type)
    if ((!lines || lines.length === 0) && fallbacks[type]) {
      for (const alt of fallbacks[type]) {
        lines = await attemptFetch(alt)
        if (lines.length) break
      }
    }
    this.setCachedData(cacheKey, lines)
    return lines
  }

  async searchItems(league: string, query: any): Promise<TradeSearchResult> {
    // If global cooldown active, wait (short-circuit) so we don't spam upstream
    if (Date.now() < globalRateLimitUntil) {
      const waitMs = globalRateLimitUntil - Date.now()
      await sleep(Math.min(waitMs, 1000)) // brief wait; UI can still show loading
      if (Date.now() < globalRateLimitUntil) {
        // Still rate limited – throw a tagged error so UI can communicate cooldown
        const remaining = Math.ceil((globalRateLimitUntil - Date.now())/1000)
        throw new Error(`rate_limited:${remaining}`)
      }
    }
    // Enforce client throttle between searches
    const since = Date.now() - tradeLastSearchAt
    if (since < tradeMinSearchInterval) {
      await sleep(tradeMinSearchInterval - since)
    }
    // Respect feature flag: if proxy disabled, fail fast so UI can use fallback
    if (typeof process !== 'undefined' && process.env.USE_TRADE_PROXY === 'false') {
      throw new Error('trade_proxy_disabled')
    }
    // Use internal proxy to avoid CORS & reduce payload
    try {
  const externalBase = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_EXTERNAL_TRADE_PROXY : undefined) || (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_EXTERNAL_TRADE_PROXY : undefined)
  const searchEndpoint = externalBase ? `${externalBase.replace(/\/$/,'')}/search` : '/api/trade/search-with-session'
  
  // Get user session ID from localStorage if available
  const userSessionId = typeof window !== 'undefined' ? localStorage.getItem('poe_session_id') : null
  
  const requestBody: any = { league, query }
  if (userSessionId) {
    requestBody.sessionId = userSessionId
  }
  
  const res = await fetch(searchEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      // Capture response body for diagnostics whether ok or not
      let text: string | null = null
      try { text = await res.text() } catch (e) { text = null }
      let parsed: any = null
      if (text) {
        try { parsed = JSON.parse(text) } catch { parsed = null }
      }

  if (!res.ok) {
        // If server-side proxy fails with IP blocking, try client-side approach
        if (res.status === 403 && typeof window !== 'undefined' && userSessionId) {
          console.log('[poe-api] Server proxy blocked, trying client-side approach')
          try {
            const { clientTradeAPI } = await import('./client-trade-api')
            const clientResult = await clientTradeAPI.searchTrade({
              league,
              query,
              sessionId: userSessionId
            })
            return {
              id: clientResult.id,
              total: clientResult.total,
              result: clientResult.result.slice(0, 100)
            }
          } catch (clientError) {
            console.error('[poe-api] Client-side fallback also failed:', clientError)
            // Continue with original error handling
          }
        }
        const bodySnippet = text ? (text.length > 2000 ? text.slice(0,2000) + '... [truncated]' : text) : ''
        const info = parsed ? JSON.stringify(parsed) : bodySnippet
        // Detect upstream rate limit (sometimes wrapped by proxy as 502 containing upstream 429)
        let rateLimitedSeconds: number | null = null
        if (text && /Rate limit exceeded; Please wait (\d+) seconds/i.test(text)) {
          const m = text.match(/Rate limit exceeded; Please wait (\d+) seconds/i)
          if (m) {
            rateLimitedSeconds = parseInt(m[1]!,10)
            lastRateLimitSeconds = rateLimitedSeconds
            globalRateLimitUntil = Date.now() + (rateLimitedSeconds*1000) + 500
            // Adaptive backoff: widen client throttle modestly while cooldown active
            tradeMinSearchInterval = Math.min(1200, 350 + rateLimitedSeconds*25)
            tradeMinFetchInterval = Math.min(900, 250 + rateLimitedSeconds*20)
          }
        }
  // Distinguish 403 (forbidden upstream) so UI can hint at Cloudflare / missing cookies
  const err = new Error(rateLimitedSeconds !== null ? `rate_limited:${rateLimitedSeconds}` : (res.status === 403 ? `forbidden_upstream:${info}` : `proxy_http_${res.status} ${info}`))
        const debug = (typeof process !== 'undefined') ? process.env.NEXT_PUBLIC_DEBUG_TRADE === 'true' : false
        if (debug) {
          console.error('Trade search proxy non-ok:', res.status, res.statusText, bodySnippet)
        } else {
          // Downgrade to warn in production to reduce console noise while still surfacing status.
          console.warn('Trade search proxy non-ok:', res.status, res.statusText)
        }
        // If rate limited we already transformed the error; just throw
        throw err
      }

      // If OK, return parsed JSON (or raw text parsed)
      if (parsed) return parsed
      const okJson = await res.json()
      tradeLastSearchAt = Date.now()
      return okJson
    } catch (e) {
      console.error('Trade search proxy failed', e)
      throw e
    }
  }

  async getItemDetails(searchId: string, itemIds: string[]): Promise<TradeItem[]> {
    try {
      if (typeof process !== 'undefined' && process.env.USE_TRADE_PROXY === 'false') {
        throw new Error('trade_proxy_disabled')
      }
      // Respect global cooldown
      if (Date.now() < globalRateLimitUntil) {
        const remaining = globalRateLimitUntil - Date.now()
        if (remaining > 1200) {
          // Don't block UI for long periods – return empty so caller can surface message
          return []
        }
        await sleep(remaining)
      }
      // Validate inputs before calling proxy
      if (typeof searchId !== 'string' || !searchId.trim()) throw new Error('invalid_search_id')
      if (!Array.isArray(itemIds) || itemIds.length === 0) throw new Error('invalid_item_ids')
      const batches: TradeItem[][] = []
      for (let i=0;i<itemIds.length;i+=10) {
        const ids = itemIds.slice(i,i+10)
        // Client-side throttle per batch
        const since = Date.now() - tradeLastFetchAt
        if (since < tradeMinFetchInterval) {
          await sleep(tradeMinFetchInterval - since)
        }
  const externalBase = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_EXTERNAL_TRADE_PROXY : undefined) || (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_EXTERNAL_TRADE_PROXY : undefined)
  const fetchEndpoint = externalBase ? `${externalBase.replace(/\/$/,'')}/fetch` : '/api/trade/fetch'
  const res = await fetch(fetchEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, query: String(searchId) })
        })
        let text: string | null = null
        try { text = await res.text() } catch { text = null }
        let parsed: any = null
        if (text) { try { parsed = JSON.parse(text) } catch { parsed = null } }
        if (!res.ok) {
          // If invalid query (400) stop further fetches to avoid spam; return what we have
            if (res.status === 400) {
              console.warn('Fetch batch returned 400 invalid query; halting remaining batches.')
              break
            }
          if (text && /Rate limit exceeded; Please wait (\d+) seconds/i.test(text)) {
            const m = text.match(/Rate limit exceeded; Please wait (\d+) seconds/i); if (m) { lastRateLimitSeconds = parseInt(m[1]!,10); globalRateLimitUntil = Date.now() + (lastRateLimitSeconds*1000)+500 }
          }
          continue
        }
        const json = parsed || await res.json()
        tradeLastFetchAt = Date.now()
        if (Array.isArray(json.result)) batches.push(json.result)
      }
      return batches.flat()
    } catch (e) {
      console.error('Trade fetch proxy failed', e)
      return []
    }
  }

  buildItemQuery(
    itemName: string,
    options: {
      minPrice?: number
      maxPrice?: number
      currency?: string
      online?: boolean
      corrupted?: boolean
      identified?: boolean
    } = {},
  ) {
    const query: any = {
      query: {
        status: {
          option: options.online !== false ? "online" : "any",
        },
        name: itemName,
        filters: {},
      },
      sort: {
        price: "asc",
      },
    }

    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      query.query.filters.trade_filters = {
        filters: {
          price: {
            min: options.minPrice,
            max: options.maxPrice,
            option: options.currency || "chaos",
          },
        },
      }
    }

    if (options.corrupted !== undefined) {
      query.query.filters.misc_filters = {
        filters: {
          corrupted: {
            option: options.corrupted,
          },
        },
      }
    }

    if (options.identified !== undefined) {
      query.query.filters.misc_filters = {
        ...query.query.filters.misc_filters,
        filters: {
          ...query.query.filters.misc_filters?.filters,
          identified: {
            option: options.identified,
          },
        },
      }
    }

    return query
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }
    return null
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * Compute a simple average chaos price from trade items.
   * If listings are in mixed currencies, convert to chaos using poe.ninja rates.
   */
  async averageListingPrice(items: TradeItem[], league: string = 'Mercenaries'): Promise<{ average: number; currency: string } | null> {
    const priced = items.filter(i=> i.listing.price && typeof i.listing.price.amount==='number')
    if (!priced.length) return null
    // Determine currency distribution
    const currencyBuckets: Record<string, number[]> = {}
    priced.forEach(i=>{
      const cur = String(i.listing.price!.currency || 'chaos')
      if (!currencyBuckets[cur]) currencyBuckets[cur] = []
      currencyBuckets[cur].push(i.listing.price!.amount || 0)
    })
    // If everything is chaos, simple average
    const currencies = Object.keys(currencyBuckets)
    if (currencies.length === 1 && currencies[0].toLowerCase().includes('chaos')) {
      const all = currencyBuckets[currencies[0]]
      const avg = all.reduce((a,b)=>a+b,0)/all.length
      return { average: avg, currency: currencies[0] }
    }
    // Otherwise fetch currency rates and convert to chaos equivalent
    // Use getCurrencyData to obtain chaosEquivalent for common currency names
    let rates: Record<string, number> = {}
    try {
      // Attempt to get chaos equivalents for known currency types in current league
      const data = await this.getCurrencyData(league)
      data.forEach(d=>{ if (d.currencyTypeName && typeof d.chaosEquivalent==='number') rates[d.currencyTypeName.toLowerCase()] = d.chaosEquivalent })
    } catch (e) {
      // ignore rate fetch failures; fallback to using raw amounts (lossy)
    }
    // Normalize currency keys (common synonyms)
    const normalize = (s:string) => s.toLowerCase().replace(/[^a-z]/g,'')
    const synonyms: Record<string,string> = {
      'chaosorb':'chaos', 'chaos':'chaos', 'c':'chaos',
      'divineorb':'divine','divine':'divine','exa':'divine'
    }
    // Convert all amounts into chaos where possible
    const converted: number[] = []
    for (const cur of currencies) {
      const amounts = currencyBuckets[cur]
      const key = normalize(cur)
      const mapped = synonyms[key] || key
      const rate = rates[mapped] || (mapped==='chaos' ? 1 : undefined)
      if (rate) {
        amounts.forEach(a=> converted.push(a * rate))
      } else {
        // Unknown currency — skip or push raw (as fallback we push raw)
        amounts.forEach(a=> converted.push(a))
      }
    }
    if (!converted.length) return null
    // Trim 10% both sides for robustness if enough samples
    const sorted = converted.sort((a,b)=>a-b)
    let use = sorted
    if (sorted.length >= 10) {
      const cut = Math.floor(sorted.length * 0.1)
      use = sorted.slice(cut, sorted.length - cut)
    }
    const avg = use.reduce((a,b)=>a+b,0)/use.length
    return { average: avg, currency: 'chaos' }
  }
}

export const poeApi = new PoEAPI()
// Expose helper for UI to obtain remaining cooldown time (ms)
;(poeApi as any).getRateLimitRemaining = () => Math.max(0, globalRateLimitUntil - Date.now())
;(poeApi as any).getLastRateLimitSeconds = () => lastRateLimitSeconds
