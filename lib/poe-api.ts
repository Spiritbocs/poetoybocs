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

class PoEAPI {
  private baseUrl = "https://api.pathofexile.com"
  private tradeUrl = "https://www.pathofexile.com/api/trade"
  private ninjaUrl = "https://poe.ninja/api/data"
  private oauthBaseUrl = "https://www.pathofexile.com"

private oauthConfig: OAuthConfig = {
  clientId: "poetoybocs",
  clientSecret: "0qOAktMWmksl", // <-- UPDATED SECRET
  redirectUri: "https://poetoybocs.vercel.app/oauth/callback", // <-- YOUR URI
  scopes: ["account:profile"], // <-- ONLY PROFILE
}

  // Cache for API responses
  private cache = new Map<string, { data: any; timestamp: number }>()
  private cacheTimeout = 10 * 60 * 1000 // 10 minutes (align with desired currency refresh cadence)

  private authToken: AuthToken | null = null

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const digest = await crypto.subtle.digest("SHA-256", data)
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
  }

  async getAuthUrl(): Promise<string> {
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = await this.generateCodeChallenge(codeVerifier)
    const state = Math.random().toString(36).substring(7)

    // Store PKCE data for token exchange
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "poe_pkce_data",
        JSON.stringify({
          codeVerifier,
          codeChallenge,
          state,
        }),
      )
    }

    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      response_type: "code",
      scope: this.oauthConfig.scopes.join(" "),
      redirect_uri: this.oauthConfig.redirectUri,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "consent",
    })

    return `${this.oauthBaseUrl}/oauth/authorize?${params.toString()}`
  }

  async exchangeCodeForToken(code: string, state: string): Promise<AuthToken> {
    try {
      // Retrieve PKCE data
      let pkceData: PKCEData | null = null
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("poe_pkce_data")
        if (stored) {
          pkceData = JSON.parse(stored)
          localStorage.removeItem("poe_pkce_data")
        }
      }

      if (!pkceData || pkceData.state !== state) {
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
        const errorData = await response.json()
        console.error("OAuth token exchange error:", response.status, errorData)
        throw new Error(`OAuth token exchange failed: ${response.status} - ${errorData.error}`)
      }

      const token = await response.json()
      this.authToken = token

      // Store in localStorage for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("poe_auth_token", JSON.stringify(token))
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("poe_auth_token")
    }
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
    const cacheKey = `currency-${realm}-${league}-${type}`
    const cached = this.getCachedData<CurrencyData[]>(cacheKey)
    if (cached) return cached

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

      this.setCachedData(cacheKey, currencyData)
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
    try {
      const response = await fetch(`${this.tradeUrl}/search/${encodeURIComponent(league)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "PoE-Market-Tracker/1.0",
        },
        body: JSON.stringify(query),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error searching items:", error)
      throw error
    }
  }

  async getItemDetails(searchId: string, itemIds: string[]): Promise<TradeItem[]> {
    try {
      const limitedIds = itemIds.slice(0, 10)
      const response = await fetch(`${this.tradeUrl}/fetch/${limitedIds.join(",")}?query=${searchId}`, {
        headers: {
          "User-Agent": "PoE-Market-Tracker/1.0",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.result || []
    } catch (error) {
      console.error("Error fetching item details:", error)
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
}

export const poeApi = new PoEAPI()
