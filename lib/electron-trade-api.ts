// Desktop-only trade API that bypasses all web restrictions
// Uses Electron's main process for direct PoE API access

interface DesktopTradeAPI {
  searchTrade: (request: {
    league: string
    query: any
    sessionId?: string
  }) => Promise<{
    id: string
    total: number
    result: string[]
  }>
  
  testConnection: (league?: string, sessionId?: string) => Promise<{
    success: boolean
    method: string
    error?: string
  }>
}

class ElectronTradeAPI implements DesktopTradeAPI {
  private static instance: ElectronTradeAPI
  
  static getInstance(): ElectronTradeAPI {
    if (!ElectronTradeAPI.instance) {
      ElectronTradeAPI.instance = new ElectronTradeAPI()
    }
    return ElectronTradeAPI.instance
  }

  async searchTrade(request: {
    league: string
    query: any
    sessionId?: string
  }) {
    const { league, query, sessionId } = request
    const url = `https://www.pathofexile.com/api/trade/search/${encodeURIComponent(league)}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    }

    if (sessionId) {
      headers['Cookie'] = `POESESSID=${sessionId}`
    }

    console.log('[ElectronTradeAPI] Making direct request to:', url)
    
    try {
      const response = await (window as any).electronAPI.poeApiRequest(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(query)
      })

      if (!response.ok) {
        throw new Error(`PoE API Error: ${response.status} ${response.statusText}`)
      }

      const data = JSON.parse(response.data)
      
      return {
        id: data.id,
        total: data.total || 0,
        result: (data.result || []).slice(0, 100)
      }
    } catch (error) {
      console.error('[ElectronTradeAPI] Request failed:', error)
      throw error
    }
  }

  async testConnection(league: string = 'Mercenaries', sessionId?: string) {
    const testQuery = {
      query: {
        status: { option: "online" },
        stats: [{ type: "and", filters: [] }]
      }
    }

    try {
      await this.searchTrade({ league, query: testQuery.query, sessionId })
      return {
        success: true,
        method: 'electron-direct'
      }
    } catch (error) {
      return {
        success: false,
        method: 'none',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

// Export singleton for use in components
export const electronTradeAPI = ElectronTradeAPI.getInstance()

// Make available globally for debugging
if (typeof window !== 'undefined' && (window as any).electronAPI) {
  (window as any).electronTradeAPI = electronTradeAPI
  console.log('[ElectronTradeAPI] Desktop trade API initialized')
}
