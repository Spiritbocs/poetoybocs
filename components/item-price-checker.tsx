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

  return (
    <div>
      {/* Search Input */}
      <div className="flex gap-2 mb-6">
        <div className="search-container flex-1">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            placeholder="Search for items (e.g., 'Tabula Rasa', 'Chaos Orb', 'Belly of the Beast')"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="search-input"
          />
        </div>
        <button onClick={handleSearch} disabled={loading || !searchTerm.trim()} className="btn btn-accent">
          {loading ? (
            <>
              <div className="spinner" style={{ width: "16px", height: "16px", marginRight: "8px" }}></div>
              Searching...
            </>
          ) : (
            <>🔍 Search</>
          )}
        </button>
      </div>

      {/* Search Results */}
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          Searching items...
        </div>
      )}

      {!loading && searchResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="card-title">Search Results</h3>
            <div className="status status-connected">{searchResults.length} items found</div>
          </div>

          <div className="grid gap-4">
            {searchResults.map((item, index) => (
              <div key={index} className="card">
                <div className="card-header">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 style={getRarityColor(item.item.rarity)}>{item.item.name || item.item.typeLine}</h4>
                      {item.item.name && item.item.typeLine && (
                        <p className="text-muted text-sm">{item.item.typeLine}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className="status status-connected">{item.item.rarity}</span>
                      {item.item.corrupted && <span className="status status-disconnected">Corrupted</span>}
                    </div>
                  </div>
                </div>

                {/* Item Properties */}
                {item.item.properties && item.item.properties.length > 0 && (
                  <div className="mb-4">
                    {item.item.properties.map((prop, propIndex) => (
                      <div key={propIndex} className="text-sm">
                        <span className="font-medium">{prop.name}:</span>{" "}
                        <span className="text-muted">{prop.values.map(([value]) => value).join(", ")}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mods */}
                {(item.item.implicitMods || item.item.explicitMods) && (
                  <div className="mb-4">
                    {item.item.implicitMods && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-muted mb-1">Implicit:</p>
                        {item.item.implicitMods.map((mod, modIndex) => (
                          <p key={modIndex} className="text-sm" style={{ color: "#8888ff" }}>
                            {mod}
                          </p>
                        ))}
                      </div>
                    )}
                    {item.item.explicitMods && (
                      <div>
                        <p className="text-sm font-medium text-muted mb-1">Explicit:</p>
                        {item.item.explicitMods.map((mod, modIndex) => (
                          <p key={modIndex} className="text-sm" style={{ color: "#ffff77" }}>
                            {mod}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <hr style={{ border: "1px solid var(--poe-border)", margin: "16px 0" }} />

                {/* Listing Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <span>👤 {item.listing.account.name}</span>
                      {item.listing.account.online && <span className="status status-connected">Online</span>}
                    </div>
                    <div className="text-sm text-muted">🕒 Listed {formatTimeAgo(item.listing.indexed)}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold mb-2">{formatPrice(item.listing.price)}</div>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        navigator.clipboard.writeText(item.listing.whisper)
                      }}
                    >
                      📋 Copy Whisper
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && searchResults.length === 0 && searchTerm && (
        <div className="card text-center">
          <div style={{ padding: "48px 24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
            <h3 className="card-title mb-2">No items found</h3>
            <p className="text-muted">Try searching for a different item name or check your spelling.</p>
          </div>
        </div>
      )}
    </div>
  )
}
