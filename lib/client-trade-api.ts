// Client-side trade API that bypasses server IP blocking
// This makes requests directly from the user's browser to avoid Cloudflare blocking Vercel IPs

interface TradeSearchRequest {
  league: string
  query: any
  sessionId?: string
}

interface TradeSearchResponse {
  id: string
  total: number
  result: string[]
  inexact?: boolean
}

class ClientTradeAPI {
  private static instance: ClientTradeAPI
  private corsProxyUrl = 'https://api.allorigins.win/raw?url='
  
  static getInstance(): ClientTradeAPI {
    if (!ClientTradeAPI.instance) {
      ClientTradeAPI.instance = new ClientTradeAPI()
    }
    return ClientTradeAPI.instance
  }

  async searchTrade(request: TradeSearchRequest): Promise<TradeSearchResponse> {
    const { league, query, sessionId } = request
    
    let directError: unknown = null
    let proxyError: unknown = null
    
    // First, try direct request (will work if user has CORS extension or if CORS is disabled)
    try {
      const directResult = await this.directTradeSearch(league, query, sessionId)
      console.log('[ClientTradeAPI] Direct request succeeded')
      return directResult
    } catch (error) {
      directError = error
      console.log('[ClientTradeAPI] Direct request failed, trying CORS proxy:', error)
    }

    // Fallback to CORS proxy
    try {
      const proxyResult = await this.proxyTradeSearch(league, query, sessionId)
      console.log('[ClientTradeAPI] Proxy request succeeded')
      return proxyResult
    } catch (error) {
      proxyError = error
      console.error('[ClientTradeAPI] Both direct and proxy requests failed')
      throw new Error(`Trade API unavailable: Direct (${directError}) | Proxy (${proxyError})`)
    }
  }

  private async directTradeSearch(league: string, query: any, sessionId?: string): Promise<TradeSearchResponse> {
    const url = `https://www.pathofexile.com/api/trade/search/${encodeURIComponent(league)}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': navigator.userAgent
    }

    if (sessionId) {
      headers['Cookie'] = `POESESSID=${sessionId}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(query),
      mode: 'cors',
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  private async proxyTradeSearch(league: string, query: any, sessionId?: string): Promise<TradeSearchResponse> {
    const targetUrl = `https://www.pathofexile.com/api/trade/search/${encodeURIComponent(league)}`
    const proxyUrl = this.corsProxyUrl + encodeURIComponent(targetUrl)
    
    // Note: CORS proxy may not support cookies perfectly, but it's worth trying
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*'
      },
      body: JSON.stringify(query)
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  // Test if trade API is accessible
  async testConnection(league: string = 'Mercenaries', sessionId?: string): Promise<{
    success: boolean
    method: 'direct' | 'proxy' | 'none'
    error?: string
  }> {
    const testQuery = {
      query: {
        status: { option: "online" },
        stats: [{ type: "and", filters: [] }]
      }
    }

    // Test direct access
    try {
      await this.directTradeSearch(league, testQuery.query, sessionId)
      return { success: true, method: 'direct' }
    } catch (directError) {
      console.log('[ClientTradeAPI] Direct test failed:', directError)
    }

    // Test proxy access
    try {
      await this.proxyTradeSearch(league, testQuery.query, sessionId)
      return { success: true, method: 'proxy' }
    } catch (proxyError) {
      console.log('[ClientTradeAPI] Proxy test failed:', proxyError)
    }

    return { 
      success: false, 
      method: 'none',
      error: 'Both direct and proxy methods failed'
    }
  }
}

// Export singleton instance
export const clientTradeAPI = ClientTradeAPI.getInstance()

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clientTradeAPI = clientTradeAPI
}
