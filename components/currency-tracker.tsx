"use client"

import { useState, useEffect } from "react"
import { Sparkline } from "./sparkline"
import { poeApi, type CurrencyData } from "@/lib/poe-api"

// Stable fallback icon for Chaos Orb supplied by user (poe.ninja / PoE CDN style)
const CHAOS_ICON_FALLBACK = "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lSZXJvbGxSYXJlIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/d119a0d734/CurrencyRerollRare.png"

interface CurrencyTrackerProps { league: string; realm?: string; initialType?: "Currency" | "Fragment" }

export function CurrencyTracker({ league, realm = 'pc', initialType }: CurrencyTrackerProps) {
  const [currencyData, setCurrencyData] = useState<CurrencyData[]>([])
  const [filteredData, setFilteredData] = useState<CurrencyData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLeague, setSelectedLeague] = useState(league)
  const [type, setType] = useState<"Currency" | "Fragment">(initialType || "Currency")
  const [mode, setMode] = useState<"buy" | "sell">("buy")
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  // Real-time (10 min) refresh handling
  const REFRESH_INTERVAL_MS = 3 * 60 * 1000 // 3-minute client refresh cadence
  const [nextRefresh, setNextRefresh] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<string>("")
  const [age, setAge] = useState<string>("")
  const [showLowConfidence, setShowLowConfidence] = useState(false)
  // respond to initialType changes (sidebar navigation)
  useEffect(() => { if (initialType && initialType !== type) setType(initialType) }, [initialType])
  const [chaosIcon, setChaosIcon] = useState<string | null>(null)
  const [divineIcon, setDivineIcon] = useState<string | null>(null)
  const [divineChaos, setDivineChaos] = useState<number | null>(null)

  // Fetch data when league or type changes
  useEffect(() => {
    if (!selectedLeague) return
    let abort = false
    async function fetchCurrencyData(realTime = false) {
      setLoading(prev => prev && !realTime)
      try {
        const data = await poeApi.getCurrencyData(selectedLeague, type, realm)
        if (abort) return
        setCurrencyData(data); setFilteredData(data)
  const chaosEntry = data.find(d=>d.detailsId==='chaos-orb')
  const divineEntry = data.find(d=>d.detailsId==='divine-orb')
  // Always keep or set a chaos icon so chain never appears without it
  setChaosIcon(prev => chaosEntry?.icon || prev || CHAOS_ICON_FALLBACK)
  // Only update divine icon if present to avoid clearing between tab switches
  if (divineEntry?.icon) setDivineIcon(divineEntry.icon)
        if (divineEntry?.chaosEquivalent) setDivineChaos(divineEntry.chaosEquivalent)
        const now = Date.now()
        setLastUpdated(now)
        setNextRefresh(now + REFRESH_INTERVAL_MS)
      } catch (error) {
        if (!abort) {
          console.error("Failed to fetch currency data:", error)
          setCurrencyData([]); setFilteredData([])
        }
      } finally { if (!abort) setLoading(false) }
    }
    fetchCurrencyData()
    const interval = setInterval(()=>fetchCurrencyData(true), REFRESH_INTERVAL_MS)
    return ()=>{ abort = true; clearInterval(interval) }
  }, [selectedLeague, type, realm])

  // Countdown display for next scheduled refresh
  useEffect(()=>{
    if (!nextRefresh) { setCountdown(""); return }
    const id = setInterval(()=>{
      const diff = nextRefresh - Date.now()
      if (diff <= 0) {
        setCountdown("Refreshing…")
        return
      }
      const m = Math.floor(diff/60000)
      const s = Math.floor((diff%60000)/1000)
      setCountdown(`${m}:${s.toString().padStart(2,'0')}`)
    }, 1000)
    return ()=> clearInterval(id)
  }, [nextRefresh])

  // Age badge (time since last update) separate from countdown
  useEffect(()=>{
    if (!lastUpdated) { setAge(""); return }
    const id = setInterval(()=>{
      const diff = Date.now() - lastUpdated
      const m = Math.floor(diff/60000)
      const s = Math.floor((diff%60000)/1000)
      setAge(`${m}:${s.toString().padStart(2,'0')}`)
    }, 1000)
    return ()=> clearInterval(id)
  }, [lastUpdated])

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

  // Mapping poe.ninja detailsId -> PoE trade exchange slugs
  const tradeSlugMap: Record<string,string> = {
    'chaos-orb':'chaos',
    'divine-orb':'divine',
    'mirror-of-kalandra':'mirror',
    'exalted-orb':'exalted',
    'orb-of-annulment':'annulment',
    'orb-of-alchemy':'alchemy',
    'orb-of-chance':'chance',
    'vaal-orb':'vaal',
    'regal-orb':'regal',
    'orb-of-fusing':'fusing',
    'orb-of-scouring':'scouring',
    'orb-of-regret':'regret',
    'engineers-orb':'engineers',
    'blessed-orb':'blessed',
    'orb-of-binding':'binding',
    'orb-of-dominance':'dominance',
    'fracturing-orb':'fracturing',
    'hinekora-s-lock':'hinekora-s-lock',
  }
  const getTradeSlug = (c: CurrencyData) => tradeSlugMap[c.detailsId] || c.detailsId.replace(/[^a-z0-9]+/gi,'-').toLowerCase()
  const buildExchangeUrl = (league: string, have: string, want: string) => {
    const query = { exchange: { status: { option: 'online' }, have: [have], want: [want] } }
    return `https://www.pathofexile.com/trade/exchange/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(query))}`
  }
  const decideBaseCurrency = (c: CurrencyData): 'chaos' | 'divine' => {
    if (!divineChaos || !c.chaosEquivalent) return 'chaos'
    // If item worth more than 5 Divine (adjustable), switch to Divine base to match market reality
    if (c.chaosEquivalent > divineChaos * 5) return 'divine'
    return 'chaos'
  }

  // Small badge component for countdown & age
  const Badge: React.FC<{ label: string; value: string; tooltip?: string; kind: 'next'|'age'; ageValue?: string | null }> = ({ label, value, tooltip, kind, ageValue }) => {
    let color = '#b30000'
    if (kind === 'age' && ageValue) {
      const [mStr] = ageValue.split(':')
      const m = parseInt(mStr,10)||0
      if (m < 3) { color = '#4caf50' }
      else if (m < 6) { color = '#ff9800' }
      else { color = '#f44336' }
    }
    return (
      <div title={tooltip} style={{ fontSize:11,fontWeight:600,letterSpacing:'.5px',display:'flex',alignItems:'center',gap:2, color }}>
        <span style={{opacity:.55}}>{label}:</span><span>{value}</span>
      </div>
    )
  }

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

  // (Old inline Sparkline removed in favor of shared component)

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
        <div className="search-container flex-1 min-w-[220px]" style={{display:'flex',flexDirection:'column'}}>
          <div className="search-icon">🔍</div>
          <input
            type="text"
            placeholder="Filter by Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {/* Timers moved to header; keep placeholder spacing */}
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
        {lastUpdated && (
          <div style={{fontSize:11,opacity:.65}}>Updated {new Date(lastUpdated).toLocaleTimeString()}</div>
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
      <div className="card-header" style={{ borderBottom: "2px solid var(--poe-border)", display:'flex',alignItems:'center',gap:16 }}>
        <h3 className="card-title" style={{display:'flex',alignItems:'center',gap:8}}>
          📈 Spiritbocs Tracker
          <span style={{fontSize:12,opacity:.5}}>({selectedLeague} Economy)</span>
        </h3>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Badge label="Next" value={countdown || '--:--'} tooltip={`Next scheduled refresh (every ${REFRESH_INTERVAL_MS/60000}m)`} kind="next" />
            <Badge label="Age" value={age || '0:00'} tooltip="Data age" kind="age" ageValue={age} />
            <span style={{cursor:'help',fontSize:14}} title={`Next = time until auto refresh. Age = time since last fetch. Interval ${REFRESH_INTERVAL_MS/60000} minutes.`}>ℹ️</span>
          </div>
          <div className="status status-connected">{filteredData.length} items</div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="sticky-col" style={{minWidth:240}}>Name</th>
              <th className="active-col" style={{minWidth:240}}>{mode === 'buy' ? 'Buying price' : 'Selling price'}</th>
              <th style={{width:110}}>Last 7 days</th>
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
                      <div className="flex items-center gap-2 justify-between" style={{width:'100%'}}>
                        <div className="flex items-center gap-2">
                          {currency.icon && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={currency.icon} alt="" title={currency.currencyTypeName} style={{ width: 40, height: 40 }} />
                          )}
                          <span className="font-medium" style={{ lineHeight: 1 }}>{currency.currencyTypeName}</span>
                        </div>
                        <a
                          href={buildWikiUrl(currency.currencyTypeName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wiki-icon-btn"
                          style={{ marginLeft:'auto' }}
                          title="Open PoE Wiki"
                        >📜</a>
                      </div>
                    </td>
                    <td className="price-cell">
                      <div className={`price-grid expanded-chain`}> 
                        {/* Divine -> Chaos -> Unit chain (hide divine if extremely small) */}
                        {(() => {
                          const divEq = currency.divineEquivalent
                          // Show divine for any sensible non-divine currency where ratio is >= 0.005 (always, no upper cap so mirrors still show)
                          const showDiv = divEq !== undefined && divEq > 0.005 && currency.detailsId !== 'divine-orb'
                          const chaosEq = currency.chaosEquivalent
                          const formatDiv = (v: number) => {
                            if (v >= 1000) return formatShort(v)
                            if (v >= 1) return v.toFixed(1).replace(/\.0$/, '')
                            return v < 0.1 ? v.toFixed(3) : v.toFixed(2)
                          }
                          if (mode === 'buy') {
                            return (
                              <>
                                {showDiv && (
                                  <>
                                    <div className="grp divine-group" title="Divine equivalent">
                                      <span className="num">{formatDiv(divEq!)}</span>
                                      {divineIcon && <img src={divineIcon} alt="Divine Orb" title="Divine Orb" />}
                                    </div>
                                    <div className="arrow">→</div>
                                  </>
                                )}
                                <div className="grp chaos-group" title="Chaos equivalent">
                                  <span className="num">{formatShort(chaosEq)}</span>
                                  {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" onError={(e)=>{ if (e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />}
                                </div>
                                <div className="arrow">→</div>
                                <div className="grp target-group" title="Unit price">
                                  <span className="num">1.0</span>
                                  {currency.icon && <img src={currency.icon} alt={currency.currencyTypeName} title={currency.currencyTypeName} />}
                                </div>
                              </>
                            )
                          } else {
                            return (
                              <>
                                <div className="grp target-group" title="Unit price">
                                  <span className="num">1.0</span>
                                  {currency.icon && <img src={currency.icon} alt={currency.currencyTypeName} title={currency.currencyTypeName} />}
                                </div>
                                <div className="arrow">→</div>
                                <div className="grp chaos-group" title="Chaos equivalent">
                                  <span className="num">{formatShort(chaosEq)}</span>
                                  {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" onError={(e)=>{ if (e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />}
                                </div>
                                {showDiv && (
                                  <>
                                    <div className="arrow">→</div>
                                    <div className="grp divine-group" title="Divine equivalent">
                                      <span className="num">{formatDiv(divEq!)}</span>
                                      {divineIcon && <img src={divineIcon} alt="Divine Orb" title="Divine Orb" />}
                                    </div>
                                  </>
                                )}
                              </>
                            )
                          }
                        })()}
                      </div>
                    </td>
                    <td>
                      <Sparkline data={spark.slice(-24)} />
                    </td>
                    <td>
                      <span style={{
                        color: change ? (change > 0 ? '#4caf50' : '#f44336') : 'var(--muted,#999)',
                        fontWeight:600
                      }}>{formatChange(change)}</span>
                    </td>
                    <td title="Approximate # of listings (side-specific count, poe.ninja style)">~{(() => {
                      // poe.ninja appears to show primary side 'count' (not data_point_count). Use side tied to displayed price.
                      const primarySide = mode === 'buy' ? currency.receive : currency.pay
                      const secondarySide = mode === 'buy' ? currency.pay : currency.receive
                      let listedRaw = primarySide?.count || primarySide?.data_point_count || 0
                      // Fallback: if zero but other side has data, use the other side's count
                      if (!listedRaw && (secondarySide?.count || secondarySide?.data_point_count)) {
                        listedRaw = secondarySide?.count || secondarySide?.data_point_count || 0
                      }
                      return listedRaw >= 1000 ? `${Math.round(listedRaw/100)/10}k` : `${listedRaw}`
                    })()}</td>
                    <td>
                      {(() => {
                        const slug = getTradeSlug(currency)
                        // Skip if slug is chaos (trading chaos for chaos pointless)
                        if (slug === 'chaos') return null
                        const base = decideBaseCurrency(currency)
                        const have = mode === 'buy' ? base : slug
                        const want = mode === 'buy' ? slug : base
                        const url = buildExchangeUrl(selectedLeague, have, want)
                        const tooltip = `${mode === 'buy' ? 'Buy' : 'Sell'} via pathofexile.com (${have} -> ${want})`
                        return <a href={url} target="_blank" rel="noopener noreferrer" className="trade-icon-btn" title={tooltip}>↗</a>
                      })()}
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
