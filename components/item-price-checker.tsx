"use client"

import type React from "react"

import { useState } from "react"
import { poeApi, type TradeItem } from "@/lib/poe-api"

export function ItemPriceChecker() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<TradeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLeague, setSelectedLeague] = useState("Mercenaries") // Default league

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    try {
      const query = poeApi.buildItemQuery(searchTerm, {
        online: true,
      })

      const searchResult = await poeApi.searchItems(selectedLeague, query)
      const itemDetails = await poeApi.getItemDetails(searchResult.id, searchResult.result)

      setSearchResults(itemDetails)
    } catch (error) {
      console.error("Search failed:", error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const formatPrice = (price: any) => {
    if (!price) return "Not priced"
    return `${price.amount} ${price.currency}`
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "normal":
        return "color: #c8c8c8"
      case "magic":
        return "color: #8888ff"
      case "rare":
        return "color: #ffff77"
      case "unique":
        return "color: #af6025"
      default:
        return "color: #c8c8c8"
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setExpanded(prev=> ({...prev, [id]: !prev[id]}))

  return (
    <div>
      <div className="flex gap-2 mb-4 items-center">
        <div className="search-container flex-1">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            placeholder="Search items (e.g. Mageblood, Headhunter)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="search-input"
          />
        </div>
        <button onClick={handleSearch} disabled={loading || !searchTerm.trim()} className="btn btn-accent">
          {loading ? 'Searching…' : 'Search'}
        </button>
        {searchResults.length>0 && <div className="status status-connected">{searchResults.length} items</div>}
      </div>

      {loading && (
        <div className="loading"><div className="spinner" /> Searching items...</div>
      )}

      {!loading && searchResults.length>0 && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{minWidth:260}}>Item</th>
                <th style={{width:120}}>Price</th>
                <th style={{width:140}}>Seller</th>
                <th style={{width:90}}>Indexed</th>
                <th style={{width:110}}>Copy Whisper</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.map(item => {
                const id = item.id
                const isOpen = !!expanded[id]
                const rarityStyle = getRarityColor(item.item.rarity)
                return (
                  <>
                    <tr key={id} className={isOpen? 'row-open': ''}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <img src={item.item.icon} alt="" style={{width:40,height:40,objectFit:'contain'}} />
                          <div style={{display:'flex',flexDirection:'column'}}>
                            <span style={rarityStyle as any}>{item.item.name || item.item.typeLine}</span>
                            {item.item.name && item.item.typeLine && <span style={{fontSize:11,opacity:.6}}>{item.item.typeLine}</span>}
                          </div>
                          <button onClick={()=>toggle(id)} style={{marginLeft:'auto',background:'none',border:'1px solid #333',color:'#bbb',fontSize:11,padding:'2px 6px',borderRadius:4,cursor:'pointer'}}>{isOpen? 'Hide' : 'Details'}</button>
                        </div>
                      </td>
                      <td style={{fontWeight:600}}>{formatPrice(item.listing.price)}</td>
                      <td style={{fontSize:12}}>
                        <div style={{display:'flex',flexDirection:'column',gap:2}}>
                          <span>{item.listing.account.name}</span>
                          {item.listing.account.online && <span style={{color:'#4ade80',fontSize:11}}>Online</span>}
                        </div>
                      </td>
                      <td style={{fontSize:12}}>{formatTimeAgo(item.listing.indexed)}</td>
                      <td>
                        <button
                          className="btn btn-sm"
                          onClick={()=>navigator.clipboard.writeText(item.listing.whisper)}
                          title="Copy whisper to clipboard"
                        >Copy</button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={id+':details'} style={{background:'#1b1b1b'}}>
                        <td colSpan={5} style={{padding:'12px 18px'}}>
                          <div style={{display:'flex',flexWrap:'wrap',gap:32}}>
                            {item.item.properties && item.item.properties.length>0 && (
                              <div style={{minWidth:200}}>
                                <div style={{fontSize:12,letterSpacing:.5,opacity:.7,marginBottom:4}}>Properties</div>
                                {item.item.properties.map((p,i)=>(
                                  <div key={i} style={{fontSize:12}}>
                                    <span style={{opacity:.8}}>{p.name}:</span> {p.values.map(([v])=>v).join(', ')}
                                  </div>
                                ))}
                              </div>
                            )}
                            {(item.item.implicitMods || item.item.explicitMods) && (
                              <div style={{minWidth:260}}>
                                {item.item.implicitMods && (
                                  <div style={{marginBottom:8}}>
                                    <div style={{fontSize:12,letterSpacing:.5,opacity:.7,marginBottom:4}}>Implicit Mods</div>
                                    {item.item.implicitMods.map((m,i)=>(<div key={i} style={{fontSize:12,color:'#8888ff'}}>{m}</div>))}
                                  </div>
                                )}
                                {item.item.explicitMods && (
                                  <div>
                                    <div style={{fontSize:12,letterSpacing:.5,opacity:.7,marginBottom:4}}>Explicit Mods</div>
                                    {item.item.explicitMods.map((m,i)=>(<div key={i} style={{fontSize:12,color:'#ffff77'}}>{m}</div>))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && searchResults.length === 0 && searchTerm && (
        <div className="card text-center">
          <div style={{ padding: "48px 24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
            <h3 className="card-title mb-2">No items found</h3>
            <p className="text-muted">Try a different item name or check spelling.</p>
          </div>
        </div>
      )}
    </div>
  )
}
