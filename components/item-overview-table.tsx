"use client"
import { useEffect, useState } from 'react'
import { poeApi } from '@/lib/poe-api'
import { Sparkline } from './sparkline'

// Stable fallback icon for Chaos Orb (same as currency tracker)
const CHAOS_ICON_FALLBACK = "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lSZXJvbGxSYXJlIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/d119a0d734/CurrencyRerollRare.png"

interface ItemOverviewTableProps { league: string; realm?: string; type: string; title: string }

export function ItemOverviewTable({ league, realm='pc', type, title }: ItemOverviewTableProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  // Build PoE trade search query body for API POST (returns hash id for /trade/search/{league}/{id})
  function buildItemTradeQuery(line: any): any | null {
    const nmLower = (line.name || line.currencyTypeName || '').toLowerCase()
    if (nmLower === 'chaos orb') return null // handled on currency tab
    const query: any = { query: { status: { option: 'online' } }, sort: { price: 'asc' } }
    const rawName = line.name && line.name.trim() ? line.name.trim() : ''
    const rawBase = line.baseType && line.baseType.trim() ? line.baseType.trim() : ''
    // Many poe.ninja lines use baseType for generic groups (e.g. Fossil, Scarab), keep name if unique-like (has spaces and capitalised words)
    if (rawName && rawBase && rawName !== rawBase) {
      query.query.name = rawName
      query.query.type = rawBase
    } else if (rawName) {
      query.query.name = rawName
    } else if (rawBase) {
      query.query.type = rawBase
    } else if (line.currencyTypeName) {
      query.query.name = line.currencyTypeName
    } else {
      return null
    }
    return query
  }
  // Cache of built search ids to avoid repeated network calls: key = league|type|name|base
  const tradeIdCache = new Map<string,string>()
  function cacheKey(line: any) {
    return [league, line.name||'', line.baseType||'', line.currencyTypeName||''].join('|')
  }
  async function openTrade(line: any, btn: HTMLButtonElement) {
    const query = buildItemTradeQuery(line)
    if (!query) return
    const key = cacheKey(line)
    const original = btn.textContent
    // Pre-open window to avoid popup blocker
    const preload = window.open('about:blank','_blank','noopener,noreferrer')
    if (tradeIdCache.has(key)) {
      const id = tradeIdCache.get(key)!
      preload?.location.replace(`https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}/${id}`)
      return
    }
    btn.textContent = '…'; btn.disabled = true
    try {
      const res = await fetch(`/api/trade/search`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ league, query }) })
      if (!res.ok) throw new Error('search_failed')
      const json = await res.json()
      if (json?.id) {
        tradeIdCache.set(key, json.id)
        preload?.location.replace(`https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}/${json.id}`)
      } else throw new Error('no_id')
    } catch (e) {
      console.warn('Trade search failed', e)
      preload?.close()
      btn.textContent = 'x'
      setTimeout(()=>{ btn.textContent = original || '↗'; btn.disabled = false }, 1200)
      return
    }
    btn.textContent = original || '↗'
    btn.disabled = false
  }

  if (loading) return <div className="loading"><div className="spinner"/>Loading {title}...</div>

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="search-container flex-1 min-w-[220px]">
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
      </div>
      <div className="card-header" style={{ borderBottom: '2px solid var(--poe-border)' }}>
        <h3 className="card-title">{title}</h3>
        <div className="status status-connected">{filtered.length} items</div>
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="sticky-col" style={{minWidth:240}}>Name</th>
              <th className="active-col" style={{minWidth:240}}>Buying price</th>
              <th style={{width:90}}>Last 7 days</th>
              <th style={{width:70}}>Change</th>
              <th style={{width:80}}># Listed</th>
              <th style={{width:90}}>Trade</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l,i)=>{
              const spark = l.sparkline?.data || []
              const change = l.sparkline?.totalChange
              const listed = l.listingCount || l.count || l.data_point_count || 0
              const name = l.name || l.baseType || l.currencyTypeName || 'Unknown'
              const chaosEq = l.chaosValue || l.chaosEquivalent
              const divineEq = divineChaos && chaosEq ? chaosEq / divineChaos : undefined
              return (
                <tr key={i}>
                  <td className="sticky-col">
                    <div className="flex items-center gap-2 justify-between" style={{width:'100%'}}>
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
                  <td><Sparkline data={spark.slice(-24)} changeHint={change} /></td>
                  <td className={getTrendColor(change)} title={change !== undefined ? `${change.toFixed(2)}%` : '0%'}>{formatChange(change)}</td>
                  <td title={`Approximate listings: ${listed}`}>~{listed >=1000? `${Math.round(listed/100)/10}k`: listed}</td>
                  <td>{(() => { const q = buildItemTradeQuery(l); return q ? <button className="trade-icon-btn" title="Open trade search" onClick={(e)=>openTrade(l, e.currentTarget)}>↗</button> : null })()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// (Legacy Spark component removed; using shared Sparkline)
