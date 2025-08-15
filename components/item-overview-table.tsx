"use client"
import { useEffect, useState } from 'react'
// Detail page navigation removed – keeping table inline only.
import { poeApi } from '@/lib/poe-api'
import { Sparkline } from './sparkline'

// Stable fallback icon for Chaos Orb (same as currency tracker)
const CHAOS_ICON_FALLBACK = "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lSZXJvbGxSYXJlIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/d119a0d734/CurrencyRerollRare.png"

interface ItemOverviewTableProps { league: string; realm?: string; type: string; title: string }

export function ItemOverviewTable({ league, realm='pc', type, title }: ItemOverviewTableProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(()=> (typeof window!=='undefined' ? (localStorage.getItem(`global_search_${type}`) || '') : ''))
  const [mode, setMode] = useState<'buy'|'sell'>(()=> (typeof window!=='undefined' && (localStorage.getItem('global_trade_mode') as any)) || 'buy')
  // Removed router usage since detail pages deleted.
  const [tooltip, setTooltip] = useState<{ x:number; y:number; row:any; spark:number[]; change7d:number; change24h:number } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
  const lines = await poeApi.getItemOverview(league, type, realm)
      if (!cancelled) {
        setData(lines)
        setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [league, type, realm])

  useEffect(()=>{ try { localStorage.setItem(`global_search_${type}`, search) } catch {} }, [search, type])
  const filtered = data.filter(l => !search || (l.name || l.baseType || l.currencyTypeName || '').toLowerCase().includes(search.toLowerCase()))
  // Capture chaos / divine icons & ratio for price chain
  const chaosEntry = filtered.find(l => (l.currencyTypeName === 'Chaos Orb' || l.name === 'Chaos Orb'))
  const divineEntry = filtered.find(l => (l.currencyTypeName === 'Divine Orb' || l.name === 'Divine Orb'))
  const chaosIcon = chaosEntry?.icon || CHAOS_ICON_FALLBACK
  const divineIcon = divineEntry?.icon
  const divineChaos = divineEntry?.chaosValue || divineEntry?.chaosEquivalent

  const formatShort = (value: number | undefined) => {
    if (value === undefined) return 'n/a'
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm'
    if (value >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
    return value.toFixed(1).replace(/\.0$/, '')
  }
  const getTrendColor = (change: number | undefined) => (!change || change === 0 ? '' : change > 0 ? 'text-success' : 'text-danger')
  const formatChange = (change: number | undefined) => {
    if (change === undefined) return '0%'
    const rounded = Math.round(change)
    return `${rounded > 0 ? '+' : ''}${rounded}%`
  }
  const buildWikiUrl = (name: string) => `https://www.poewiki.net/wiki/${encodeURIComponent(name.replace(/ /g,'_'))}`
  const formatDivVal = (v: number) => {
    if (v >= 1000) return formatShort(v)
    if (v >= 1) return v.toFixed(1).replace(/\.0$/,'')
    return v < 0.1 ? v.toFixed(3) : v.toFixed(2)
  }

  // Build PoE trade search query body (client-side navigation; mimics poe.ninja formatting)
  function buildItemTradeQuery(line: any): any | null {
    const nmLower = (line.name || line.currencyTypeName || '').toLowerCase()
    if (nmLower === 'chaos orb') return null
    const rawName = (line.name || '').trim()
    const rawBase = (line.baseType || '').trim()
    const ctn = (line.currencyTypeName || '').trim()
    const query: any = { query: { status: { option: 'online' } }, sort: { price: 'asc' } }
    // Include dummy ilvl filter like poe.ninja (prevents some API caching quirks)
    query.query.filters = { misc_filters: { filters: { ilvl: { min: 0, max: 0 } } } }
    if (rawName && rawBase && rawName !== rawBase) {
      // Unique items (e.g. Headhunter Leather Belt)
      query.query.name = rawName
      query.query.type = rawBase
    } else {
      const chosen = rawBase || rawName || ctn
      if (!chosen) return null
      // Use type.option form for base-type style items (Fossils, Scarabs, Embers...)
      query.query.type = { option: chosen }
    }
    return query
  }
  function buildTradeUrl(line: any): string | null {
    const query = buildItemTradeQuery(line)
    if (!query) return null
    const json = encodeURIComponent(JSON.stringify(query))
    return `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${json}`
  }

  if (loading) return <div className="loading"><div className="spinner"/>Loading {title}...</div>

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="search-container flex-1 min-w-[220px]" style={{display:'flex',alignItems:'center'}}>
          <div className="search-icon">🔍</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Filter ${title}`} className="search-input" />
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
          <button className={mode==='buy'? 'active':''} onClick={()=>{ setMode('buy'); localStorage.setItem('global_trade_mode','buy') }}>Buy</button>
          <button className={mode==='sell'? 'active':''} onClick={()=>{ setMode('sell'); localStorage.setItem('global_trade_mode','sell') }}>Sell</button>
        </div>
      </div>
      {/* Unified header style (match Currency tracker visual) */}
      <div className="card-header" style={{ borderBottom: '2px solid var(--poe-border)', display:'flex',alignItems:'center',gap:16 }}>
        <h3 className="card-title" style={{display:'flex',alignItems:'center',gap:8}}>
          {title}
          <span style={{fontSize:12,opacity:.5}}>({league} Economy)</span>
        </h3>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:12}}>
          <div className="status status-connected">{filtered.length} items</div>
        </div>
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="sticky-col" style={{minWidth:240}}>Name</th>
              <th className="active-col" style={{minWidth:240}}>{mode==='buy'? 'Buying price':'Selling price'}</th>
              <th style={{width:110}}>Last 7 days</th>
              <th style={{width:70}}>Change</th>
              <th style={{width:80}}># Listed</th>
              <th style={{width:90}}>Trade</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l,i)=>{
              const spark = l.sparkline?.data || []
              const change = l.sparkline?.totalChange
              const seg = Math.max(1, Math.round(spark.length/7))
              const change24 = (()=>{ if (spark.length<2) return 0; const first = spark[spark.length - seg] ?? spark[0]; const last = spark[spark.length-1]; return first? ((last-first)/first)*100 : 0 })()
              const listed = l.listingCount || l.count || l.data_point_count || 0
              const name = l.name || l.baseType || l.currencyTypeName || 'Unknown'
              const chaosEq = l.chaosValue || l.chaosEquivalent
              const divineEq = divineChaos && chaosEq ? chaosEq / divineChaos : undefined
              return (
                <tr key={i}
                  onMouseLeave={()=> setTooltip(null)}
                >
                  <td className="sticky-col">
                    <div className="flex items-center gap-2 justify-between" style={{width:'100%', position:'relative'}}
                      onMouseEnter={(e)=>{ const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setTooltip({ x: rect.left+4, y: rect.top+4, row:l, spark, change7d: change||0, change24h: change24 }) }}
                      onMouseMove={(e)=>{ const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setTooltip(t=> t? { ...t, x: rect.left+4, y: rect.top+4 }: t) }}
                    >
                      <div className="flex items-center gap-2">
                        {l.icon && <img src={l.icon} alt={name} title={name} style={{width:40,height:40}} />}
                        <span className="font-medium" style={{lineHeight:1}}>{name}</span>
                      </div>
                      <a href={buildWikiUrl(name)} target="_blank" rel="noopener noreferrer" className="wiki-icon-btn" style={{ marginLeft:'auto' }} title="Open PoE Wiki">📜</a>
                    </div>
                  </td>
                  <td className="price-cell">
                    <div className={`price-grid expanded-chain`}>
                      {(() => {
                        const showDiv = divineEq !== undefined && divineEq > 0.005 && name.toLowerCase() !== 'divine orb'
                        if (showDiv) {
                          return (
                            <>
                              <div className="grp divine-group" title="Divine equivalent">
                                <span className="num">{formatDivVal(divineEq!)}</span>
                                {divineIcon && <img src={divineIcon} alt="Divine Orb" title="Divine Orb" />}
                              </div>
                              <div className="arrow">→</div>
                              <div className="grp chaos-group" title="Chaos equivalent">
                                <span className="num">{formatShort(chaosEq)}</span>
                                {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" onError={(e)=>{ if (e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />}
                              </div>
                              <div className="arrow">→</div>
                              <div className="grp target-group" title="Unit price">
                                <span className="num">1.0</span>
                                {l.icon && <img src={l.icon} alt={name} title={name} />}
                              </div>
                            </>
                          )
                        }
                        return (
                          <>
                            <div className="grp chaos-group" title="Chaos equivalent">
                              <span className="num">{formatShort(chaosEq)}</span>
                              {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" onError={(e)=>{ if (e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />}
                            </div>
                            <div className="arrow">→</div>
                            <div className="grp target-group" title="Unit price">
                              <span className="num">1.0</span>
                              {l.icon && <img src={l.icon} alt={name} title={name} />}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </td>
                  <td><Sparkline data={spark.slice(-24)} changeHint={change} delayMs={i*25} /></td>
                  <td className={getTrendColor(change)} title={change !== undefined ? `${change.toFixed(2)}%` : '0%'}>{formatChange(change)}</td>
                  <td title={`Approximate listings: ${listed}`}>~{listed >=1000? `${Math.round(listed/100)/10}k`: listed}</td>
                  <td>{(() => { const url = buildTradeUrl(l); return url ? <a className="trade-icon-btn" href={url} target="_blank" rel="noopener noreferrer" title="Open trade search">↗</a> : null })()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {tooltip && tooltip.row && (
          <div className="poe-tooltip" style={{position:'fixed', left: tooltip.x, top: tooltip.y, maxWidth:220}}>
            <h4 style={{margin:0,fontSize:13}}>{tooltip.row.name || tooltip.row.baseType || tooltip.row.currencyTypeName}</h4>
            <div className="tt-line" style={{color: tooltip.change7d>0? '#57d977': tooltip.change7d<0? '#ff6a6a':'#d5c186'}}>7d: {tooltip.change7d>0?'+':''}{Math.round(tooltip.change7d)}%</div>
            <div className="tt-line" style={{color: tooltip.change24h>0? '#57d977': tooltip.change24h<0? '#ff6a6a':'#d5c186'}}>~24h: {tooltip.change24h>0?'+':''}{Math.round(tooltip.change24h)}%</div>
            {(() => { const ce = tooltip.row.chaosValue || tooltip.row.chaosEquivalent; if (!ce) return null; return <div className="tt-line">Chaos: <strong>{ce.toFixed(2)}</strong></div> })()}
            {(() => { if (!divineChaos) return null; const ce = tooltip.row.chaosValue || tooltip.row.chaosEquivalent; if (!ce) return null; const de = ce / divineChaos; return <div className="tt-line">Divine: <strong>{de.toFixed(4)}</strong></div> })()}
            <div className="tt-line" style={{opacity:.45, marginTop:4}}>Detail pages disabled</div>
          </div>
        )}
      </div>
    </div>
  )
}

// (Legacy Spark component removed; using shared Sparkline)
