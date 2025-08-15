"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { poeApi, type TradeItem } from "@/lib/poe-api"

export function ItemPriceChecker() {
  // Simple name search (legacy fallback)
  const [searchTerm, setSearchTerm] = useState("")
  // Clipboard mode
  const [rawClipboard, setRawClipboard] = useState("")
  const [parsed, setParsed] = useState<any | null>(null)
  const [mode, setMode] = useState<'simple'|'clipboard'>(()=> (typeof window!=="undefined" ? (localStorage.getItem('price_checker_mode') as any)||'clipboard':'clipboard'))
  const [searchResults, setSearchResults] = useState<TradeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLeague, setSelectedLeague] = useState("Mercenaries")
  const [priceSummary, setPriceSummary] = useState<{min:number; max:number; median:number; average:number; count:number; confidence:number} | null>(null)
  const [error, setError] = useState<string | null>(null)

  const persistMode = (m:'simple'|'clipboard')=>{ setMode(m); try{ localStorage.setItem('price_checker_mode',m)}catch{} }

  const handleSearch = async () => {
    setError(null)
    if (mode==='simple') {
      if (!searchTerm.trim()) return
      setLoading(true)
      try {
        const query = poeApi.buildItemQuery(searchTerm, { online: true })
        const searchResult = await poeApi.searchItems(selectedLeague, query)
        const itemDetails = await poeApi.getItemDetails(searchResult.id, searchResult.result)
        setSearchResults(itemDetails)
        summarize(itemDetails)
      } catch (e:any) {
        console.error('Search failed', e)
        setError('Search failed')
        setSearchResults([])
        setPriceSummary(null)
      } finally { setLoading(false) }
    } else {
      // Clipboard mode
      if (!rawClipboard.trim()) { setError('Paste item text first'); return }
      const p = parseClipboard(rawClipboard)
      setParsed(p)
      if (!p || !p.baseType) { setError('Could not parse base type'); return }
      setLoading(true)
      try {
        const query = buildTradeQueryFromParsed(p)
        const searchResult = await poeApi.searchItems(selectedLeague, query)
        const ids = searchResult.result.slice(0, 30) // cap for speed
        const details = await poeApi.getItemDetails(searchResult.id, ids)
        setSearchResults(details)
        summarize(details)
      } catch (e:any) {
        console.error('Clipboard pricing failed', e)
        setError('Pricing failed (API)')
        setSearchResults([])
        setPriceSummary(null)
      } finally { setLoading(false) }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key==='Enter' && e.metaKey) handleSearch() }

  // Parse PoE clipboard text (approx)
  const parseClipboard = (raw: string) => {
    const lines = raw.replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(l=>l.length>0)
    if (!lines.length) return null
    const obj: any = { implicits:[], explicits:[], influences:[] }
    for (let i=0;i<lines.length;i++) {
      const line = lines[i]
      if (line.startsWith('Item Class:')) obj.itemClass = line.split(':')[1].trim()
      else if (line.startsWith('Rarity:')) obj.rarity = line.split(':')[1].trim()
      else if (!obj.name && obj.rarity && obj.rarity.toLowerCase()==='rare') { obj.name = line; obj.baseType = lines[i+1]; i++ }
      else if (!obj.baseType && obj.rarity && obj.rarity.toLowerCase()!=='rare' && !line.startsWith('--------')) { obj.baseType = line }
      else if (/^Quality:/i.test(line)) { const m=line.match(/Quality:\s*\+?(\d+)/i); if (m) obj.quality=Number(m[1]) }
      else if (/Energy Shield:/i.test(line)) { const m=line.match(/Energy Shield:\s*(\d+)/i); if (m) obj.energyShield=Number(m[1]) }
      else if (/Armour:/i.test(line)) { const m=line.match(/Armour:\s*(\d+)/i); if (m) obj.armour=Number(m[1]) }
      else if (/Evasion Rating:/i.test(line)) { const m=line.match(/Evasion Rating:\s*(\d+)/i); if (m) obj.evasion=Number(m[1]) }
      else if (/Item Level:/i.test(line)) { const m=line.match(/Item Level:\s*(\d+)/i); if (m) obj.itemLevel=Number(m[1]) }
      else if (/^Sockets:/i.test(line)) { obj.sockets = line.replace(/^Sockets:\s*/i,''); obj.links = largestLinkGroup(obj.sockets) }
      else if (/Searing Exarch Item/i.test(line)) obj.influences.push('searing_exarch')
      else if (/Eater of Worlds Item/i.test(line)) obj.influences.push('eater_of_worlds')
    }
    // Split implicits / explicits via markers '(implicit)' OR first explicit mod with + or % etc after implicit section
    const implicitIdx = lines.findIndex(l=>l.includes('(implicit)'))
    if (implicitIdx>=0) {
      for (const l of lines.slice(implicitIdx, lines.length)) {
        if (l.includes('(implicit)')) obj.implicits.push(l.replace(/\s*\(implicit\)/i,''))
      }
    }
    // Explicit mods: lines after implicit group removing influences and system lines
    const modStart = implicitIdx>=0? implicitIdx + obj.implicits.length + 1 : 0
    for (let j=modStart;j<lines.length;j++) {
      const l=lines[j]
      if (/^(Item Class|Rarity|Quality|Requirements|Sockets|Item Level)/i.test(l)) continue
      if (l.includes('(implicit)')) continue
      if (/Item$/.test(l)) continue
      if (/^[-]+$/.test(l)) continue
      if (/^(Searing Exarch Item|Eater of Worlds Item)/i.test(l)) continue
      if (/^[+\-].+|\d+%/i.test(l)) obj.explicits.push(l)
    }
    return obj
  }

  const largestLinkGroup = (socketStr:string): number => {
    // Example: G-G-B-B-B-B or R-G-B | groups separated by spaces
    const groups = socketStr.split(/\s|,/).filter(Boolean)
    let max=0
    groups.forEach(g=>{ const links = g.split('-').length; if(links>max) max=links })
    return max
  }

  const buildTradeQueryFromParsed = (p:any) => {
    const rarity = (p.rarity||'').toLowerCase()
    const query:any = { query:{ status:{ option:'online' }, filters:{} as any }, sort:{ price:'asc' } }
    if (rarity==='unique') {
      if (p.baseType) query.query.type = { option: p.baseType }
      if (p.name && p.name!==p.baseType) query.query.name = p.name
    } else if (rarity==='rare') {
      if (p.name) query.query.name = p.name
      if (p.baseType) query.query.type = p.baseType
      query.query.filters.type_filters = { filters: { rarity: { option:'rare' } } }
    } else {
      if (p.baseType) query.query.type = { option: p.baseType }
    }
    const miscFilters:any = {}
    if (p.quality) miscFilters.quality = { min: p.quality }
    if (p.itemLevel) miscFilters.ilvl = { min: Math.max(1,p.itemLevel-2), max: p.itemLevel }
    if (Object.keys(miscFilters).length) query.query.filters.misc_filters = { filters: miscFilters }
    if (p.links && p.links>=5) query.query.filters.socket_filters = { filters:{ links:{ min:p.links } } }
    if (p.energyShield) query.query.filters.armor_filters = { filters:{ es:{ min: Math.floor(p.energyShield*0.9), max: p.energyShield+5 } } }
    if (p.armour || p.evasion) {
      query.query.filters.armor_filters = query.query.filters.armor_filters || { filters:{} }
      if (p.armour) query.query.filters.armor_filters.filters.ar = { min: Math.floor(p.armour*0.9) }
      if (p.evasion) query.query.filters.armor_filters.filters.ev = { min: Math.floor(p.evasion*0.9) }
    }
    if (Array.isArray(p.influences) && p.influences.length) {
      const infFilters:any = {}
      p.influences.forEach((inf:string)=>{ infFilters[inf] = { option: 'true' } })
      query.query.filters.influence_filters = { filters: infFilters }
    }
    return query
  }

  const summarize = (items: TradeItem[]) => {
    const priced = items.filter(i=> i.listing.price && typeof i.listing.price.amount==='number')
    if (!priced.length) { setPriceSummary(null); return }
    const amounts = priced.map(i=> i.listing.price!.amount).sort((a,b)=>a-b)
    const min=amounts[0]; const max=amounts[amounts.length-1]; const median=amounts[Math.floor(amounts.length/2)]
    const avg = amounts.reduce((a,b)=>a+b,0)/amounts.length
    // Confidence heuristic: quantity & dispersion
    const spread = max===0?0: (max-min)/Math.max(1, (max+min)/2)
    const qtyScore = Math.min(1, priced.length/30)
    const spreadScore = spread>1?0: 1-spread
    const confidence = Math.round((0.6*qtyScore + 0.4*spreadScore)*100)
    setPriceSummary({ min, max, median, average:avg, count:priced.length, confidence })
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
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <div className="segmented">
          <button className={mode==='clipboard'? 'active':''} onClick={()=>persistMode('clipboard')}>Clipboard Paste</button>
          <button className={mode==='simple'? 'active':''} onClick={()=>persistMode('simple')}>Simple Name</button>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
          <select value={selectedLeague} onChange={e=>setSelectedLeague(e.target.value)} style={{background:'#1e1e1e',border:'1px solid #333',color:'#ddd',padding:'6px 10px',borderRadius:4,fontSize:12}}>
            {/* Basic league list; could be dynamic */}
            <option value="Mercenaries">Mercenaries</option>
            <option value="Hardcore Mercenaries">Hardcore Mercenaries</option>
            <option value="Standard">Standard</option>
            <option value="Hardcore">Hardcore</option>
          </select>
        </div>
      </div>

      {mode==='clipboard' && (
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
          <textarea
            placeholder="Paste full item text from game (Ctrl+C on item)"
            value={rawClipboard}
            onChange={e=> setRawClipboard(e.target.value)}
            style={{width:'100%',minHeight:260,background:'#111',border:'1px solid #333',color:'#ddd',padding:12,fontFamily:'Consolas, monospace',fontSize:12,borderRadius:6,resize:'vertical'}}
          />
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button onClick={handleSearch} disabled={loading || !rawClipboard.trim()} className="btn btn-accent">{loading? 'Pricing…':'Price It'}</button>
            {priceSummary && <div style={{fontSize:12,opacity:.7}}>Listings: {priceSummary.count} • Confidence: {priceSummary.confidence}%</div>}
            {error && <div style={{fontSize:12,color:'#ff6a6a'}}>{error}</div>}
          </div>
          {parsed && (
            <div style={{display:'flex',flexWrap:'wrap',gap:18,fontSize:12,background:'#161616',border:'1px solid #262626',padding:'10px 14px',borderRadius:6}}>
              <div><span style={{opacity:.55}}>Rarity</span><div>{parsed.rarity||'?'}</div></div>
              <div><span style={{opacity:.55}}>Base</span><div>{parsed.baseType||'?'}</div></div>
              {parsed.energyShield && <div><span style={{opacity:.55}}>ES</span><div>{parsed.energyShield}</div></div>}
              {parsed.armour && <div><span style={{opacity:.55}}>Armour</span><div>{parsed.armour}</div></div>}
              {parsed.evasion && <div><span style={{opacity:.55}}>Evasion</span><div>{parsed.evasion}</div></div>}
              {parsed.quality && <div><span style={{opacity:.55}}>Quality</span><div>+{parsed.quality}%</div></div>}
              {parsed.links && <div><span style={{opacity:.55}}>Links</span><div>{parsed.links}</div></div>}
              {parsed.itemLevel && <div><span style={{opacity:.55}}>iLvl</span><div>{parsed.itemLevel}</div></div>}
              {parsed.influences?.length>0 && <div><span style={{opacity:.55}}>Influences</span><div>{parsed.influences.join(', ')}</div></div>}
            </div>
          )}
          {priceSummary && (
            <div style={{background:'#141414',border:'1px solid #2a2a2a',padding:'16px 18px',borderRadius:8}}>
              <div style={{display:'flex',alignItems:'center',gap:24,flexWrap:'wrap'}}>
                <div style={{fontSize:13,letterSpacing:.5,opacity:.85}}>Estimated Price Range (chaos)</div>
                <div style={{display:'flex',gap:16,fontSize:13}}>
                  <div><span style={{opacity:.55}}>Min</span><div style={{fontWeight:600}}>{priceSummary.min.toFixed(1)}</div></div>
                  <div><span style={{opacity:.55}}>Median</span><div style={{fontWeight:600}}>{priceSummary.median.toFixed(1)}</div></div>
                  <div><span style={{opacity:.55}}>Avg</span><div style={{fontWeight:600}}>{priceSummary.average.toFixed(1)}</div></div>
                  <div><span style={{opacity:.55}}>Max</span><div style={{fontWeight:600}}>{priceSummary.max.toFixed(1)}</div></div>
                </div>
                <div style={{marginLeft:'auto',fontSize:11,opacity:.5}}>Heuristic (not ML) • Confidence {priceSummary.confidence}%</div>
              </div>
            </div>
          )}
        </div>
      )}

      {mode==='simple' && (
        <div className="flex gap-2 mb-4 items-center">
          <div className="search-container flex-1">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              placeholder="Search items (e.g. Mageblood, Headhunter)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyPress}
              className="search-input"
            />
          </div>
          <button onClick={handleSearch} disabled={loading || !searchTerm.trim()} className="btn btn-accent">
            {loading ? 'Searching…' : 'Search'}
          </button>
          {priceSummary && <div className="status status-connected">{priceSummary.count} priced</div>}
        </div>
      )}

      {loading && (
        <div className="loading"><div className="spinner" /> {mode==='clipboard'? 'Pricing item...' : 'Searching items...'}</div>
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

      {!loading && mode==='simple' && searchResults.length === 0 && searchTerm && (
        <div className="card text-center">
          <div style={{ padding: "48px 24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
            <h3 className="card-title mb-2">No items found</h3>
            <p className="text-muted">Try a different item name or check spelling.</p>
          </div>
        </div>
      )}
      {!loading && mode==='clipboard' && priceSummary===null && parsed && !error && (
        <div style={{fontSize:12,opacity:.55,marginTop:8}}>No priced listings matched filters. Try removing links/quality (edit text) and re-price.</div>
      )}
    </div>
  )
}
