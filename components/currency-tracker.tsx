"use client"

import { useState, useEffect } from "react"
import { poeApi, type CurrencyData } from "@/lib/poe-api"

interface CurrencyTrackerProps { league: string; realm?: string; initialType?: "Currency" | "Fragment" }

export function CurrencyTracker({ league, realm = 'pc', initialType }: CurrencyTrackerProps) {
  const [currencyData, setCurrencyData] = useState<CurrencyData[]>([])
  const [filteredData, setFilteredData] = useState<CurrencyData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLeague, setSelectedLeague] = useState(league)
  const [type, setType] = useState<"Currency" | "Fragment">(initialType || "Currency")
  const [mode, setMode] = useState<"buy" | "sell">("buy")
  const [showLowConfidence, setShowLowConfidence] = useState(false)
  // respond to initialType changes (sidebar navigation)
  useEffect(() => { if (initialType && initialType !== type) setType(initialType) }, [initialType])
  const [chaosIcon, setChaosIcon] = useState<string | null>(null)
  const [divineIcon, setDivineIcon] = useState<string | null>(null)
  const [divineChaos, setDivineChaos] = useState<number | null>(null)

  // Fetch data when league or type changes
  useEffect(() => {
    async function fetchCurrencyData() {
      setLoading(true)
      try {
  const data = await poeApi.getCurrencyData(selectedLeague, type, realm)
        setCurrencyData(data)
        setFilteredData(data)
  const chaosEntry = data.find((d) => d.detailsId === "chaos-orb")
  const divineEntry = data.find((d) => d.detailsId === "divine-orb")
  const chaos = chaosEntry?.icon || null
  const divine = divineEntry?.icon || null
        setChaosIcon(chaos)
        setDivineIcon(divine)
  if (divineEntry?.chaosEquivalent) setDivineChaos(divineEntry.chaosEquivalent)
      } catch (error) {
        console.error("Failed to fetch currency data:", error)
        setCurrencyData([])
        setFilteredData([])
      } finally {
        setLoading(false)
      }
    }
    fetchCurrencyData()
    const interval = setInterval(fetchCurrencyData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [selectedLeague, type, realm])

  // Sync prop -> internal league
  useEffect(() => {
    setSelectedLeague(league)
  }, [league])

  // Filter on search / low confidence
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase()
    let filtered = currencyData.filter((c) => {
      if (term && !c.currencyTypeName.toLowerCase().includes(term)) return false
      // Low confidence: BOTH sides have almost no samples (threshold relaxed to <3 like earlier working version)
      const payPts = c.paySparkLine?.data?.filter(n=>n!==0).length || 0
      const recvPts = c.receiveSparkLine?.data?.filter(n=>n!==0).length || 0
      const lowConfidence = payPts < 3 && recvPts < 3
      if (!showLowConfidence && lowConfidence) return false
      return true
    })
    // Safety: if we filtered down to 0 or 1 but original had many, show all (avoid empty chart issue)
    if (!showLowConfidence && currencyData.length > 10 && filtered.length <= 1) {
      console.warn('[CurrencyTracker] Low confidence filter too aggressive, showing all.');
      filtered = currencyData
    }
    setFilteredData(filtered)
  }, [searchTerm, currencyData, showLowConfidence])

  const formatValue = (value: number | undefined) => (value === undefined ? "N/A" : value.toFixed(2))
  const formatShort = (value: number | undefined) => {
    if (value === undefined) return "N/A"
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m"
    if (value >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "k"
    return value.toFixed(1).replace(/\.0$/, "")
  }
  const getTrendColor = (change: number | undefined) => (!change || change === 0 ? "" : change > 0 ? "text-success" : "text-danger")
  const formatChange = (change: number | undefined) => {
    if (change === undefined) return "0%"
    const rounded = Math.round(change)
    return `${rounded > 0 ? "+" : ""}${rounded}%`
  }

  const buildWikiUrl = (name: string) => `https://www.poewiki.net/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`
  const approx = (n?: number) => (n ? `~${n}` : "~0")

  const TradeMenu: React.FC<{ currency: CurrencyData }> = ({ currency }) => {
    const [open, setOpen] = useState(false)
    const baseName = currency.currencyTypeName
    const toggle = () => setOpen((o) => !o)
    const actions = [
      `Buy with Divine Orbs`,
      `Buy with Chaos Orbs`,
      `Buy with Divine Orbs (10+ stock)`,
      `Buy with Divine Orbs (25+ stock)`,
      `Buy with Divine Orbs (50+ stock)`,
      `Buy with Chaos Orbs (10+ stock)`,
      `Buy with Chaos Orbs (25+ stock)`,
      `Buy with Chaos Orbs (50+ stock)`,
    ]
    const handle = (a: string) => {
      // Placeholder: copy formatted string for now
      navigator.clipboard.writeText(`${a}: ${baseName}`)
      setOpen(false)
    }
    return (
      <div style={{ position: "relative" }}>
        <button className="btn btn-sm" onClick={toggle}>Trade ↔</button>
        {open && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "110%",
              background: "var(--poe-surface, #1e1e1e)",
              border: "1px solid var(--poe-border)",
              borderRadius: 6,
              padding: 8,
              minWidth: 200,
              zIndex: 20,
            }}
          >
            {actions.map((a) => (
              <div
                key={a}
                onClick={() => handle(a)}
                style={{ padding: "4px 6px", cursor: "pointer", fontSize: 12 }}
                className="hover:bg-accent"
              >
                {a}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const Sparkline: React.FC<{ data?: number[] }> = ({ data }) => {
    if (!data || data.length < 2) return <div style={{ height: 24 }} />
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const points = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * 60
        const y = 24 - ((v - min) / range) * 24
        return `${x},${y}`
      })
      .join(" ")
    return (
      <svg width={60} height={24} viewBox="0 0 60 24" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="var(--poe-gold, #c8a252)"
          strokeWidth={2}
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading currency data...
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="search-container flex-1 min-w-[220px]">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            placeholder="Filter by Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        {divineChaos && chaosIcon && divineIcon && (
          <div className="conversion-pill" title="Divine to Chaos ratio">
            <span className="num">1</span>
            <img src={divineIcon} alt="Divine" />
            <span style={{opacity:.6}}>=</span>
            <span className="num">{formatShort(divineChaos)}</span>
            <img src={chaosIcon} alt="Chaos" />
          </div>
        )}
        <div className="segmented">
          <button className={type === 'Currency' ? 'active' : ''} onClick={()=>setType('Currency')}>Currency</button>
          <button className={type === 'Fragment' ? 'active' : ''} onClick={()=>setType('Fragment')}>Fragments</button>
        </div>
        <div className="segmented">
          <button className={mode === 'buy' ? 'active' : ''} onClick={()=>setMode('buy')}>Buy</button>
          <button className={mode === 'sell' ? 'active' : ''} onClick={()=>setMode('sell')}>Sell</button>
        </div>
        {showLowConfidence && (
          <div className="low-conf-warning" role="alert">⚠️ <strong>Warning:</strong> Low confidence values will likely be misleading.</div>
        )}
        <div className="toggle-wrapper low-conf-toggle">
          <label className="toggle-label">
            <span className="label-text">Show low confidence <span className="info-icon" aria-label="Info" tabIndex={0}>i</span>
              <span className="tooltip" role="tooltip">These listings have very few samples (both pay & receive counts &lt; 5) and their prices can swing wildly. Enable only if you need to see every currency.</span>
            </span>
            <div className="toggle">
              <input type="checkbox" checked={showLowConfidence} onChange={e=>setShowLowConfidence(e.target.checked)} />
              <div className="toggle-track"><div className="toggle-thumb" /></div>
            </div>
          </label>
        </div>
      </div>

      {/* Currency Table */}
      <div className="card-header" style={{ borderBottom: "2px solid var(--poe-border)" }}>
        <h3 className="card-title">📈 {selectedLeague} Economy</h3>
        <div className="status status-connected">{filteredData.length} items</div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="sticky-col" style={{minWidth:200}}>Name</th>
              <th className="active-col" style={{minWidth:240}}>{mode === 'buy' ? 'Buying price' : 'Selling price'}</th>
              <th style={{width:90}}>Last 7 days</th>
              <th style={{width:70}}>Change</th>
              <th style={{width:80}}># Listed</th>
              <th style={{width:90}}>Trade</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  {searchTerm
                    ? "No currencies found matching your search"
                    : "No currency data available (fetch failed or empty)."}
                </td>
              </tr>
            ) : (
              filteredData.map((currency, index) => {
                // Sparkline: for buy mode show receive (what you get), sell mode show pay (what others pay)
                const sparkSource = mode === 'buy' ? (currency.receiveSparkLine || currency.paySparkLine) : (currency.paySparkLine || currency.receiveSparkLine)
                const spark = sparkSource?.data || []
                const change = sparkSource?.totalChange
                // Listed approximated via max data_point_count similar to poe.ninja representation
                const listedRaw = Math.max(
                  currency.pay?.data_point_count || 0,
                  currency.receive?.data_point_count || 0,
                )
                const listed = listedRaw >= 1000 ? `${Math.round(listedRaw/100)/10}k` : `${listedRaw}`
                return (
                  <tr key={index}>
                    <td className="sticky-col">
                      <div className="flex items-center gap-2">
                        {currency.icon && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={currency.icon} alt="" title={currency.currencyTypeName} style={{ width: 40, height: 40 }} />
                        )}
                        <span className="font-medium" style={{ lineHeight: 1 }}>{currency.currencyTypeName}</span>
                      </div>
                    </td>
                    <td className="price-cell">
                      <div className={`price-grid no-divine`}> 
                        <a
                          href={buildWikiUrl(currency.currencyTypeName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="badge wiki-badge"
                          style={{ textTransform: 'lowercase' }}
                        >
                          wiki ↗
                        </a>
                        {mode === 'buy' ? (
                          <>
                            <div className="grp chaos-group" title="Chaos equivalent">
                              <span className="num">{formatShort(currency.chaosEquivalent)}</span>
                              {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" />}
                            </div>
                            <div className="arrow">→</div>
                            <div className="grp target-group" title="Unit price">
                              <span className="num">1.0</span>
                              {currency.icon && <img src={currency.icon} alt={currency.currencyTypeName} title={currency.currencyTypeName} />}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grp target-group" title="Unit price">
                              <span className="num">1.0</span>
                              {currency.icon && <img src={currency.icon} alt={currency.currencyTypeName} title={currency.currencyTypeName} />}
                            </div>
                            <div className="arrow">→</div>
                            <div className="grp chaos-group" title="Chaos equivalent">
                              <span className="num">{formatShort(currency.chaosEquivalent)}</span>
                              {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" />}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <Sparkline data={spark.slice(-24)} />
                    </td>
                    <td className={getTrendColor(change)}>{formatChange(change)}</td>
                    <td>~{listed}</td>
                    <td>
                      <TradeMenu currency={currency} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
