"use client"

import React from "react"

import { useState, useEffect } from "react"
import { poeApi, type TradeItem } from "@/lib/poe-api"
import { useLeague } from "./league-context"

export function ItemPriceChecker() {
  // Simple name search (legacy fallback)
  const [searchTerm, setSearchTerm] = useState("")
  // Clipboard mode
  const [rawClipboard, setRawClipboard] = useState("")
  const [parsed, setParsed] = useState<any | null>(null)
  const [mode, setMode] = useState<'simple'|'clipboard'>(()=> (typeof window!=="undefined" ? (localStorage.getItem('price_checker_mode') as any)||'clipboard':'clipboard'))
  const [searchResults, setSearchResults] = useState<TradeItem[]>([])
  const [loading, setLoading] = useState(false)
  const { league: selectedLeague } = useLeague()
  const [priceSummary, setPriceSummary] = useState<{
    min:number; max:number; median:number; average:number; trimmedAverage:number;
    suggestedChaos:number; // suggested in chaos (base before currency auto-display)
    suggested:{ amount:number; currency:'chaos'|'div' };
    quickSell:{ amount:number; currency:'chaos'|'div' };
    fairPrice:{ amount:number; currency:'chaos'|'div' };
  quickSellChaos?:number; fairPriceChaos?:number;
  count:number; confidence:number; originalCount:number; removed:number; divRate:number|null;
  } | null>(null)
  const [showExplain,setShowExplain] = useState(false)
  const [exactPrice, setExactPrice] = useState<{ average: number; currency: string } | null>(null)
  // Per-item cooldown (to avoid hammering trade API & 429s)
  const COOLDOWN_MS = 60_000
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const [cooldownActiveKey, setCooldownActiveKey] = useState<string | null>(null)
  const COOLDOWN_TOOLTIP = "This progress bar shows a 60 second cooldown for this exact item (base + enabled mods) to prevent hitting Path of Exile trade API rate limits (429 Too Many Requests). You can still price different items immediately. When the bar empties or shows 0s, you may re-check this item. This helps keep the tool fast for everyone and avoids forced delays from the API.".replace(/\s+/g,' ').trim()
  // Manual cooldown reset (user initiated) – clears stored timestamp for active key
  const resetCooldown = () => {
    try {
      const raw = localStorage.getItem('price_check_cooldowns')
      if (raw) {
        const map = JSON.parse(raw)
        if (cooldownActiveKey && map[cooldownActiveKey]) {
          delete map[cooldownActiveKey]
          localStorage.setItem('price_check_cooldowns', JSON.stringify(map))
        }
      }
    } catch {/* ignore */}
    setCooldownRemaining(0)
    setCooldownActiveKey(null)
  }
  const [error, setError] = useState<string | null>(null)
  // Capture extra metadata when upstream 403 occurs so we can render a guidance banner
  const [forbiddenMeta, setForbiddenMeta] = useState<{ hint?: string; sessionAttached?: boolean; consecutiveForbidden?: number }|null>(null)
  const [tradeSearchId, setTradeSearchId] = useState<string | null>(null)
  // Quick filter state (mirrors the overlay)
  const [rarityFilter, setRarityFilter] = useState<string>('any')
  const [currencyFilter, setCurrencyFilter] = useState<string>('chaos')
  const [onlineOnly, setOnlineOnly] = useState<boolean>(true)
  const [timeFilter, setTimeFilter] = useState<string>('any')
  const [ilvlMin, setIlvlMin] = useState<string>('')
  const [ilvlMax, setIlvlMax] = useState<string>('')
  const [qualityMin, setQualityMin] = useState<string>('')
  const [qualityMax, setQualityMax] = useState<string>('')
  const [linksMin, setLinksMin] = useState<string>('')
  const [poePriceResult, setPoePriceResult] = useState<{min: number; max: number; currency: string; confidence: number} | null>(null)
  const [poePriceLoading, setPoePriceLoading] = useState(false)
  const [poePriceNote, setPoePriceNote] = useState<string | null>(null)
  // Fallback poe.ninja baseline when trade API blocked
  const [fallbackPrice, setFallbackPrice] = useState<{ chaos:number; source:string; matched:string }|null>(null)
  const [lastQuery, setLastQuery] = useState<any | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [hideCrafted, setHideCrafted] = useState(true)
  const [pseudoMods, setPseudoMods] = useState<Array<{ id:string; text:string; value:number }>>([])
  const [filtersDirty, setFiltersDirty] = useState(false)
  // Track whether a search was executed so we don't show empty placeholder rows
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [lastSuccessfulResults, setLastSuccessfulResults] = useState<TradeItem[]>([])
  const [noFilterMatch, setNoFilterMatch] = useState(false)
  // Indicates when we automatically stripped pseudo.* filters to recover from empty/invalid query
  const [autoStrippedPseudos, setAutoStrippedPseudos] = useState<null | { reason:string }>(null)
  const [approximateResults, setApproximateResults] = useState(false)
  const [showModHelp, setShowModHelp] = useState(false)
  // Display mode for prices: chaos only, auto chaos/divine, or chaos equivalent with both
  const [priceDisplayMode, setPriceDisplayMode] = useState<'chaos'|'auto'|'equiv'>('auto')
  // Currency icons (align with currency tracker implementation)
  const CHAOS_ICON_FALLBACK = "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lSZXJvbGxSYXJlIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/d119a0d734/CurrencyRerollRare.png"
  const [chaosIcon,setChaosIcon] = useState<string|null>(null)
  const [divineIcon,setDivineIcon] = useState<string|null>(null)
  const ICON_SIZE = 18
  const iconStyle: React.CSSProperties = { width: ICON_SIZE, height: ICON_SIZE, objectFit:'contain', verticalAlign:'text-bottom' }
  useEffect(()=>{ if(!selectedLeague) return; let cancelled=false; (async()=>{ try { const cur= await poeApi.getCurrencyData(selectedLeague,'Currency'); if(cancelled) return; const chaos=cur.find(c=>c.detailsId==='chaos-orb'); const div=cur.find(c=>c.detailsId==='divine-orb'); setChaosIcon(chaos?.icon || CHAOS_ICON_FALLBACK); if(div?.icon) setDivineIcon(div.icon) } catch { setChaosIcon(c=> c||CHAOS_ICON_FALLBACK) } })(); return ()=>{ cancelled=true } },[selectedLeague])

  // Per-stat quick filter state (initialized from parsed item lines)
  const [statFilters, setStatFilters] = useState<Record<string,{ enabled: boolean; min: string; max: string; quality: string; text?: string; source?: string }>>({})

  // Button styles to match top-nav (pills) for consistent UI
  const btnStyle: React.CSSProperties = {
    background:'linear-gradient(#2b2b2b,#1f1f1f)',
    color:'#d8d8d8',
    border:'1px solid #3b3b3b',
    padding:'4px 10px',
    borderRadius:14,
    fontSize:12,
    cursor:'pointer',
    boxShadow:'0 1px 2px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.04)',
    transition:'background .15s, color .15s, transform .15s'
  }
  const btnStylePrimary: React.CSSProperties = {
    ...btnStyle,
    background:'linear-gradient(90deg,#7d531f,#b47a2d)',
    border:'1px solid #b58235',
    color:'#ffe7b8',
    padding:'6px 12px'
  }

  const persistMode = (m:'simple'|'clipboard')=>{ setMode(m); try{ localStorage.setItem('price_checker_mode',m)}catch{} }

  // Convert a raw mod line into PoE-style placeholder form (numbers -> #, keep +/- and % and ranges)
  const normalizeModLine = (line:string):string => {
    return line
      .replace(/\s*\(implicit\)/ig,'')
      .replace(/([+-]?)(\d+(?:\.\d+)?)/g, (_m, sign)=> (sign||'') + '#')
      .replace(/#+(\s+to\s+)#+/g, '# to #') // collapse weird doubled patterns if any
      .replace(/\s+/g,' ') // tidy spaces
      .trim()
  }

  // Initialize stat filters when parsed changes
  useEffect(()=>{
    if (!parsed) { setStatFilters({}); return }
    const rawLines: Array<{text:string,source:'implicit'|'explicit'}> = []
    if (Array.isArray(parsed.implicits)) parsed.implicits.forEach((t:any)=> rawLines.push({ text: t, source: 'implicit' }))
    if (Array.isArray(parsed.explicits)) parsed.explicits.forEach((t:any)=> rawLines.push({ text: t, source: 'explicit' }))
    const map: Record<string,{ enabled:boolean; min:string; max:string; quality:string; text:string; source:string }> = {}
    const filteredLines = rawLines.filter(r => !(hideCrafted && /crafted/i.test(r.text)))
    // Helper to accumulate pseudo stats
    let fire=0,cold=0,light=0,life=0,mana=0,str=0,dex=0,intel=0,esFlat=0
    filteredLines.forEach((ln, i)=>{
      const id = `stat_${i}_${ln.text.slice(0,40).replace(/[^a-z0-9]/gi,'')}`
      const m = ln.text.match(/[-+]?[0-9]+(?:\.[0-9]+)?/)
      const rawNum = m ? Number(m[0]) : undefined
      // Provide 80% baseline slack so we don't over-constrain; mimic overlay behaviour of slight reduction.
      const slackFactor = 0.8
      const defaultMin = rawNum !== undefined
        ? String(rawNum >= 10 ? Math.max(1, Math.floor(rawNum * slackFactor)) : Math.max(0, rawNum - 1))
        : ''
      // Only enable implicit or prefix-like (expanded list) lines
      const low = ln.text.toLowerCase()
      const prefixWords = ['adds','add','increased','reduced','chance','critical','attack','attacks','cast','speed','damage','resistance','life','mana','energy shield','armour','evasion','strength','dexterity','intelligence','attribute','attributes','chaos','elemental']
      const containsPrefix = prefixWords.some(w=> low.includes(w))
      // Weighted scoring: implicit always strong; large numeric values & defensive/offensive keywords raise score.
      let score = 0
      if (ln.source === 'implicit') score += 3
      if (containsPrefix) score += 1
      if (/maximum life|maximum mana|energy shield|resistance|strength|dexterity|intelligence/i.test(ln.text)) score += 2
      if (/spell damage|attack speed|cast speed|critical/i.test(ln.text)) score += 2
      if (/all elemental resistances|to fire and cold|to cold and lightning|to fire and lightning/i.test(ln.text)) score += 1
      if (rawNum && rawNum >= 50) score += 1
      // Enable if score above threshold; threshold dynamic: keep top N (<=8) after building list (second pass). For now mark provisional.
      const provisionalEnabled = score >= 3
      const enabled = provisionalEnabled
      map[id] = { enabled, min: defaultMin, max: '', quality: parsed?.quality ? String(parsed.quality) : '', text: ln.text, source: ln.source }
      // Capture pseudo contributions
      const numMatches = ln.text.match(/[-+]?[0-9]+/g) || []
      const firstNum = numMatches.length? Number(numMatches[0]):0
      if (/to Fire Resistance/i.test(ln.text)) fire += firstNum
      if (/to Cold Resistance/i.test(ln.text)) cold += firstNum
      if (/to Lightning Resistance/i.test(ln.text)) light += firstNum
      if (/to maximum Life/i.test(ln.text)) life += firstNum
      if (/to maximum Mana/i.test(ln.text)) mana += firstNum
      if (/(^|\s)\+?\d+\s+Strength/i.test(ln.text)) str += firstNum
      if (/(^|\s)\+?\d+\s+Dexterity/i.test(ln.text)) dex += firstNum
      if (/(^|\s)\+?\d+\s+Intelligence/i.test(ln.text)) intel += firstNum
      if (/Energy Shield/i.test(ln.text) && /\d/.test(ln.text)) esFlat += firstNum
    })
    const pseudoList: Array<{ id:string; text:string; value:number }> = []
    const totalEle = fire+cold+light
    if (totalEle>0) pseudoList.push({ id:'pseudo_total_ele_res', text:'(pseudo) (total) +'+totalEle+'% total Elemental Resistance', value: totalEle })
    if (life>0) pseudoList.push({ id:'pseudo_total_life', text:'(pseudo) (total) +'+life+' to maximum Life', value: life })
    if (mana>0) pseudoList.push({ id:'pseudo_total_mana', text:'(pseudo) (total) +'+mana+' to maximum Mana', value: mana })
    if (str>0) pseudoList.push({ id:'pseudo_total_str', text:'(pseudo) (total) +'+str+' to Strength', value: str })
    if (dex>0) pseudoList.push({ id:'pseudo_total_dex', text:'(pseudo) (total) +'+dex+' to Dexterity', value: dex })
    if (intel>0) pseudoList.push({ id:'pseudo_total_int', text:'(pseudo) (total) +'+intel+' to Intelligence', value: intel })
    if (esFlat>0) pseudoList.push({ id:'pseudo_total_es', text:'(pseudo) (total) +'+esFlat+' to Energy Shield', value: esFlat })
    setPseudoMods(pseudoList)
    // Second pass: ensure we don't auto-enable too many (limit 8 highest score) for clarity.
    const pw: string[] = ['adds','add','increased','reduced','chance','critical','attack','attacks','cast','speed','damage','resistance','life','mana','energy shield','armour','evasion','strength','dexterity','intelligence','attribute','attributes','chaos','elemental']
    const scored = Object.entries(map).map(([id,st]) => {
      // recreate score quickly
      const txt = st.text.toLowerCase()
      let s = 0
      if (st.source === 'implicit') s += 3
      if (pw.some((w:string)=> txt.includes(w))) s += 1
      if (/maximum life|maximum mana|energy shield|resistance|strength|dexterity|intelligence/.test(txt)) s += 2
      if (/spell damage|attack speed|cast speed|critical/.test(txt)) s += 2
      if (/all elemental resistances|to fire and cold|to cold and lightning|to fire and lightning/.test(txt)) s += 1
      const num = parseInt(st.min || '0',10)
      if (num >= 50) s += 1
      return { id, st, s }
    })
    scored.sort((a,b)=> b.s - a.s)
    const keepEnabled = new Set(scored.slice(0,8).filter(e=> e.s >= 2).map(e=> e.id))
    const finalMap: typeof map = {}
    for (const { id, st } of scored) {
      finalMap[id] = { ...st, enabled: keepEnabled.has(id) }
    }
    setStatFilters(finalMap)
  // Mark filters dirty after initial parse only if a search already occurred
  setFiltersDirty(prev=> searchPerformed ? true : prev)
  }, [parsed])

  // Infer a poe.ninja overview type for a parsed item (uniques only for now)
  function inferNinjaType(p:any): string | null {
    if (!p) return null
    const rarity = (p.rarity||'').toLowerCase()
    const base = (p.baseType||'').toLowerCase()
    const name = (p.name||'').toLowerCase()
    if (rarity === 'unique') {
      if (/flask/.test(base)) return 'UniqueFlask'
      if (/belt|ring|amulet/.test(base)) return 'UniqueAccessory'
      if (/jewel/.test(base)) return 'UniqueJewel'
      if (/relic/.test(base)) return 'UniqueRelic'
      if (/tincture/.test(base)) return 'UniqueTincture'
      if (/map/.test(base)) return 'UniqueMap'
      if (/weapon|sword|axe|mace|bow|wand|staff|dagger|claw|rapier|foil|quiver|sceptre/.test(base) || /sword|axe|mace|bow|wand|staff|dagger|claw|rapier|foil|quiver/.test(name)) return 'UniqueWeapon'
      if (/helmet|helm|gloves|boots|greaves|gauntlets|plate|armour|evasion|shield|buckler|kite|tower/.test(base)) return 'UniqueArmour'
      return 'UniqueArmour'
    }
    return null
  }

  // Populate fallback price when we encounter a forbidden trade upstream (once per parsed item)
  useEffect(()=>{ (async()=>{
    if (!forbiddenMeta || fallbackPrice || !parsed) return
    const t = inferNinjaType(parsed)
    if (!t) return
    try {
      const lines = await poeApi.getItemOverview(selectedLeague, t)
      if (Array.isArray(lines) && lines.length) {
        const lower = (s:string)=> s.toLowerCase()
        const targetName = lower(parsed.name||'')
        const targetBase = lower(parsed.baseType||'')
        let found = lines.find((l:any)=> lower(l.name||'') === targetName)
        if (!found && targetBase) found = lines.find((l:any)=> lower(l.baseType||'') === targetBase)
        if (found && typeof found.chaosValue === 'number') {
          setFallbackPrice({ chaos: found.chaosValue, source: t, matched: found.name || found.baseType })
        }
      }
    } catch {/* ignore */}
  })() }, [forbiddenMeta, fallbackPrice, parsed, selectedLeague])

  // showFilters toggles the inline filter panel in the form

  const handleSearch = async () => {
    setError(null)
  setSearchPerformed(true)
    // Build a stable key for current search (clipboard or simple)
    const buildKey = () => {
      if (mode==='clipboard') {
        const txt = rawClipboard.replace(/\r/g,'').trim()
        // simple hash
        let h = 0
        for (let i=0;i<txt.length;i++) { h = (h<<5) - h + txt.charCodeAt(i); h |= 0 }
        return 'clip:' + h
      } else {
        const term = searchTerm.trim().toLowerCase()
        let h = 0
        for (let i=0;i<term.length;i++) { h = (h<<5) - h + term.charCodeAt(i); h |= 0 }
        return 'simple:' + h
      }
    }
    const key = buildKey()
    const now = Date.now()
    let map: Record<string, number> = {}
    try { const raw = localStorage.getItem('price_check_cooldowns'); if (raw) map = JSON.parse(raw) } catch {}
    const lastTs = map[key]
    if (lastTs && now - lastTs < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - lastTs)
      setCooldownActiveKey(key)
      setCooldownRemaining(remaining)
      setError(`Cooldown – wait ${Math.ceil(remaining/1000)}s before rechecking this item.`)
      return
    }
    // Record start of new cooldown (even if request later errors) to guard against rapid retries
    map[key] = now
    try { localStorage.setItem('price_check_cooldowns', JSON.stringify(map)); localStorage.setItem('price_check_active_key', key) } catch {}
    setCooldownActiveKey(key)
    setCooldownRemaining(COOLDOWN_MS)
    if (mode==='simple') {
      if (!searchTerm.trim()) return
      setLoading(true)
  try {
  const query = poeApi.buildItemQuery(searchTerm, { online: onlineOnly })
  // add currency/rarity quick filters
  if (currencyFilter) {
    query.query.filters = { ...query.query.filters, trade_filters: { filters: { price: { option: currencyFilter } } } }
  }

  if (rarityFilter && rarityFilter !== 'any') {
    query.query.filters = { ...query.query.filters, type_filters: { filters: { rarity: { option: rarityFilter } } } }
  }
  setLastQuery(query)
        const searchResult = await poeApi.searchItems(selectedLeague, query)
  setTradeSearchId(searchResult?.id || null)
        if (!searchResult || !searchResult.id || !Array.isArray(searchResult.result) || !searchResult.result.length) {
          // Preserve existing results if we had any previously
          if (lastSuccessfulResults.length) {
            setError('No new listings found (showing previous)')
            setSearchResults(lastSuccessfulResults)
          } else {
            throw new Error('empty_search_result')
          }
        } else {
          const itemDetails = await poeApi.getItemDetails(searchResult.id, searchResult.result)
          setSearchResults(itemDetails)
          setLastSuccessfulResults(itemDetails)
          await summarize(itemDetails, selectedLeague)
          try { const avg = await poeApi.averageListingPrice(itemDetails, selectedLeague); setExactPrice(avg) } catch {}
        }
      } catch (e:any) {
        console.error('Search failed', e)
        if (typeof e?.message === 'string' && e.message.startsWith('rate_limited:')) {
          const secs = parseInt(e.message.split(':')[1]||'0',10)
          setError(`Rate limited – wait ${secs}s before retrying.`)
        } else if (typeof e?.message === 'string' && e.message.startsWith('forbidden_upstream:')) {
          try {
            const jsonPart = e.message.replace('forbidden_upstream:','')
            const parsed = JSON.parse(jsonPart)
            setForbiddenMeta({ hint: parsed?.hint, sessionAttached: parsed?.sessionAttached, consecutiveForbidden: parsed?.consecutiveForbidden })
            setError('Forbidden by trade site – anti-bot protection. See guidance below.')
          } catch {
            setError('Forbidden by upstream trade site (Cloudflare). Try again later or open official trade site to refresh cookies.')
          }
        } else {
          setError('Search failed')
        }
        setSearchResults([])
        setPriceSummary(null)
    setExactPrice(null)
      } finally { setLoading(false) }
    } else {
      // Clipboard mode
      if (!rawClipboard.trim()) { setError('Paste item text first'); return }
      const p = parseClipboard(rawClipboard)
      setParsed(p)
      if (!p || !p.baseType) { setError('Could not parse item'); return }
      setLoading(true)
      // Start poeprices.info request in parallel
      fetchPoePriceEstimate(rawClipboard, selectedLeague)
      
      try {
        const parsedP = p
        const query = buildTradeQueryFromParsed(parsedP)
        setLastQuery(query)
             let searchResult: any
        try {
          searchResult = await poeApi.searchItems(selectedLeague, query)
        } catch (err:any) {
          if (typeof err?.message === 'string' && err.message.startsWith('rate_limited:')) {
            const secs = parseInt(err.message.split(':')[1]||'0',10)
            setError(`Rate limited – wait ${secs}s before retrying.`)
            setLoading(false)
            return
          }
          throw err
        }
        let effectiveLeague = selectedLeague
        setTradeSearchId(searchResult?.id || null)
        const isUnique = parsedP.rarity && parsedP.rarity.toLowerCase()==='unique'
        // Helper to determine if result payload is empty
        const isEmpty = (res:any) => (!res || !res.id || !Array.isArray(res.result) || !res.result.length)
        if (isEmpty(searchResult)) {
          // Fallback 1 (unique only): remove stats block
          if (isUnique && query?.query?.stats) {
            const fallbackQuery = JSON.parse(JSON.stringify(query))
            delete fallbackQuery.query.stats
            try {
              const retry = await poeApi.searchItems(selectedLeague, fallbackQuery)
              if (!isEmpty(retry)) {
                setLastQuery(fallbackQuery)
                setTradeSearchId(retry.id)
                searchResult = retry as any
              }
            } catch {/* ignore and continue */}
          }
        }
        if (isEmpty(searchResult)) {
          // Fallback 2: try Standard league (often uniques absent in temp league late cycle)
            if (!/^Standard$/i.test(selectedLeague)) {
              const stdQuery = JSON.parse(JSON.stringify(query))
              try {
                const retryStd = await poeApi.searchItems('Standard', stdQuery)
                if (!isEmpty(retryStd)) {
                  effectiveLeague = 'Standard'
                  setLastQuery(stdQuery)
                  setTradeSearchId(retryStd.id)
                  searchResult = retryStd as any
                }
              } catch {/* ignore */}
            }
        }
        if (isEmpty(searchResult)) {
          // Fallback 3: relax online filter to any (sometimes no online listings)
          if (query?.query?.status?.option === 'online') {
            const anyQuery = JSON.parse(JSON.stringify(query))
            if (anyQuery.query?.status) anyQuery.query.status.option = 'any'
            try {
              const retryAny = await poeApi.searchItems(effectiveLeague, anyQuery)
              if (!isEmpty(retryAny)) {
                setLastQuery(anyQuery)
                setTradeSearchId(retryAny.id)
                searchResult = retryAny as any
              }
            } catch {/* ignore */}
          }
        }
        if (isEmpty(searchResult)) {
          throw new Error('empty_search_result')
        }
        // Helper to test matches with optional relaxFactor (to lower min thresholds further)
        const testMatches = (item: TradeItem, relaxFactor = 1) => {
          const mods: string[] = []
          if (Array.isArray(item.item.implicitMods)) mods.push(...item.item.implicitMods)
          if (Array.isArray(item.item.explicitMods)) mods.push(...item.item.explicitMods)
          for (const st of Object.values(statFilters)) {
            if (!st.enabled) continue
            const needle = (st.text || '').toLowerCase()
            if (!needle) continue
            const found = mods.find(m=> m.toLowerCase().includes(needle))
            if (!found) return false
            const nums = (found.match(/[-+]?[0-9]+(?:\.[0-9]+)?/g) || []).map(Number)
            const minValOrig = st.min ? Number(st.min) : undefined
            const maxVal = st.max ? Number(st.max) : undefined
            const minVal = (minValOrig !== undefined) ? Math.floor(minValOrig * relaxFactor) : undefined
            if (minVal !== undefined) {
              const maxNum = nums.length ? Math.max(...nums) : undefined
              if (maxNum === undefined || maxNum < minVal) return false
            }
            if (maxVal !== undefined) {
              const minNum = nums.length ? Math.min(...nums) : undefined
              if (minNum === undefined || minNum > maxVal) return false
            }
          }
          return true
        }

        const allIds = searchResult.result
        const batchSize = 20
        let fetched: TradeItem[] = []
        let filteredDetails: TradeItem[] = []
        // Progressive fetch until we have matches or reach limits
        for (let offset=0; offset < allIds.length && offset < 200 && filteredDetails.length < 8; offset += batchSize) {
          const slice = allIds.slice(offset, offset + batchSize)
          const batch = await poeApi.getItemDetails(searchResult.id, slice)
          fetched = fetched.concat(batch)
          filteredDetails = fetched.filter(it=> testMatches(it, 1))
        }
        // If still none, relax thresholds (0.9 then 0.8) and/or broaden sample if possible
        if (!filteredDetails.length) {
          // Try relaxation on already fetched items first
            filteredDetails = fetched.filter(it=> testMatches(it, 0.9))
        }
        if (!filteredDetails.length) {
          filteredDetails = fetched.filter(it=> testMatches(it, 0.8))
        }
        // If still none and we haven't exhausted IDs, fetch more ignoring match cap
        if (!filteredDetails.length) {
          for (let offset = fetched.length; offset < allIds.length && offset < 300 && !filteredDetails.length; offset += batchSize) {
            const slice = allIds.slice(offset, offset + batchSize)
            const batch = await poeApi.getItemDetails(searchResult.id, slice)
            fetched = fetched.concat(batch)
            filteredDetails = fetched.filter(it=> testMatches(it, 0.8))
          }
        }
        setSearchResults(filteredDetails)
      try { const avg2 = await poeApi.averageListingPrice(filteredDetails, selectedLeague); setExactPrice(avg2) } catch {}
  await summarize(filteredDetails, selectedLeague)
      } catch (e:any) {
  console.error('Clipboard pricing failed', e)
  const raw = e?.message || String(e)
  // If it's a proxy_http error include full raw payload so user can copy upstream PoE response
  let msg = 'Pricing failed (API)'
  if ((raw||'').startsWith('rate_limited:')) {
    const secs = parseInt(raw.split(':')[1]||'0',10)
    msg = `Rate limited – wait ${secs}s before retrying.`
  }
  if ((raw||'').startsWith('forbidden_upstream:')) {
    try {
      const js = JSON.parse(raw.replace('forbidden_upstream:',''))
      setForbiddenMeta({ hint: js?.hint, sessionAttached: js?.sessionAttached, consecutiveForbidden: js?.consecutiveForbidden })
      msg = 'Forbidden by trade site – anti-bot protection. Guidance below.'
    } catch {
      msg = 'Forbidden by upstream trade site (Cloudflare). Try again shortly or open the official trade site once to establish cookies.'
    }
  } else if ((raw||'').startsWith('proxy_http_')) {
    const payload = raw.replace(/^proxy_http_\d+\s*/, '')
    try {
      const parsedPayload = JSON.parse(payload)
      // If upstream response included a response.error.message show it
      const upstream = parsedPayload.response || parsedPayload.body || parsedPayload
      if (upstream && upstream.error && upstream.error.message) {
        msg = `Trade upstream: ${upstream.error.message}`
      } else {
        msg = `Trade API error: ${payload}`
      }
    } catch (pe) {
      msg = `Trade API error: ${payload}`
    }
  } else if ((raw||'').includes('empty_search_result')) {
    msg = lastSuccessfulResults.length ? 'No listings now – showing previous results' : 'No listings found'
  }
  setError(msg)
    setSearchResults([])
      setExactPrice(null)
  setPriceSummary(null)
      } finally { setLoading(false) }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key==='Enter' && e.metaKey) handleSearch() }

  const handlePasteSubmit = () => {
    if (!rawClipboard.trim()) { setError('Paste item text first'); return }
    const p = parseClipboard(rawClipboard)
    setExactPrice(null)
    setParsed(p)
    // statFilters will be initialized by useEffect
    setError(null)
  }

  // Parse PoE clipboard text (approx)
  const parseClipboard = (raw: string) => {
    const linesFull = raw.replace(/\r/g,'').split('\n')
    const lines = linesFull.map(l=>l.trim()).filter(l=>l.length>0)
    if (!lines.length) return null
    const obj: any = { implicits:[], explicits:[], influences:[] }
    let rarityIdx = -1
    for (let i=0;i<lines.length;i++) {
      const line = lines[i]
      if (line.startsWith('Item Class:')) obj.itemClass = line.split(':')[1].trim()
      else if (line.startsWith('Rarity:')) { obj.rarity = line.split(':')[1].trim(); rarityIdx = i }
      else if (!obj.name && obj.rarity && obj.rarity.toLowerCase()==='rare') { obj.name = line; obj.baseType = lines[i+1]; i++ }
      else if (!obj.baseType && obj.rarity && obj.rarity.toLowerCase()!=='rare' && !line.startsWith('--------')) { obj.baseType = line }
      else if (/^Quality:/i.test(line)) { const m=line.match(/Quality:\s*\+?(\d+)/i); if (m) obj.quality=Number(m[1]) }
      else if (/Energy Shield:/i.test(line)) { const m=line.match(/Energy Shield:\s*(\d+)/i); if (m) obj.energyShield=Number(m[1]) }
      else if (/Armour:/i.test(line)) { const m=line.match(/Armour:\s*(\d+)/i); if (m) obj.armour=Number(m[1]) }
      else if (/Evasion Rating:/i.test(line)) { const m=line.match(/Evasion Rating:\s*(\d+)/i); if (m) obj.evasion=Number(m[1]) }
      else if (/Item Level:/i.test(line)) { const m=line.match(/Item Level:\s*(\d+)/i); if (m) obj.itemLevel=Number(m[1]) }
      else if (/^Sockets:/i.test(line)) {
        obj.sockets = line.replace(/^Sockets:\s*/i,'').trim()
        obj.links = largestLinkGroup(obj.sockets)
        try {
          const socketMeta = parseSockets(obj.sockets)
          obj.socketInfo = socketMeta
        } catch {/* ignore parse errors */}
      }
      else if (/Searing Exarch Item/i.test(line)) obj.influences.push('searing_exarch')
      else if (/Eater of Worlds Item/i.test(line)) obj.influences.push('eater_of_worlds')
    }
    // Post-process Unique name/base detection: if rarity unique and we only captured baseType (which may actually be name)
    if (obj.rarity && obj.rarity.toLowerCase()==='unique' && rarityIdx>=0) {
      // The two lines after rarity (before separator) are usually name then base type if they differ
      const after = linesFull.slice(rarityIdx+1).map(l=>l.trim()).filter(l=>l && !/^[-]+$/.test(l))
      if (after.length>=1) {
        if (!obj.name) obj.name = after[0]
        if (after.length>=2) {
          const potentialBase = after[1]
          if (!obj.baseType || obj.baseType===obj.name) obj.baseType = potentialBase
        }
      }
      if (obj.name===obj.baseType) { /* some uniques have same base */ }
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

  const fetchPoePriceEstimate = async (itemText: string, league: string) => {
    setPoePriceResult(null)
  setPoePriceNote(null)
    setPoePriceLoading(true)
    try {
      const response = await fetch('/api/poeprices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemText, league })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      // Upstream mapped errors return { error:'poeprices_error', code, message }
      if (data && data.error === 'poeprices_error') {
        console.warn('PoePrice API returned mapped error:', data.code, data.message)
        setPoePriceResult(null)
        // Provide user-facing explanation for common codes
        if (data.code === 5) {
          setPoePriceNote('ML estimate unavailable: not enough similar listings (use heuristic values).')
        } else if (data.code === 3) {
          setPoePriceNote('ML estimate skipped: item appears unpriceable / meta not supported.')
        } else {
          setPoePriceNote('ML estimate unavailable.')
        }
        return
      }
      // Handle successful response from poeprices.info
      if (data && data.min && data.max && data.currency) {
        setPoePriceResult({
          min: parseFloat(data.min),
          max: parseFloat(data.max),
          currency: data.currency,
          confidence: data.confidence || 0
        })
      } else if (data.error) {
        console.warn('PoePrice API returned error:', data.error)
        setPoePriceNote('ML estimate error.')
      }
    } catch (e) {
      console.error('Failed to fetch poeprices estimate:', e)
      setPoePriceNote('ML estimate request failed (network).')
    } finally {
      setPoePriceLoading(false)
    }
  }

  const largestLinkGroup = (socketStr:string): number => {
    // Groups separated by spaces or commas; within a group sockets separated by '-'
    if (!socketStr) return 0
    const groups = socketStr.trim().split(/\s+|,/).filter(Boolean)
    let max = 0
    for (const g of groups) {
      // Defensive: strip non socket chars
      const cleaned = g.replace(/[^RGBWA-]/gi,'')
      if (!cleaned) continue
      const links = cleaned.split('-').filter(Boolean).length
      if (links > max) max = links
    }
    return max
  }

  // Parse sockets string into structured info: total count, color counts, groups, largest link group length
  const parseSockets = (socketStr: string) => {
    // Game format examples:
    //  "G-B-B-R-R" (all linked)
    //  "G-B-B R-R" (two groups: 3L and 2L)
    //  "G-G-G-G-G-G" (6L)
    //  "R-G-B-W" (4L with a white socket)
    //  Abyssal sockets sometimes show as "R-G-B A" (treat A separately)
    const groupTokens = socketStr.trim().split(/\s+/).filter(Boolean)
    const groups: string[][] = groupTokens.map(tok => tok.split('-').filter(Boolean))
    const colors: Record<string, number> = {}
    let total = 0
    let largest = 0
    groups.forEach(g => {
      largest = Math.max(largest, g.length)
      g.forEach(c => {
        const up = c.toUpperCase()
        colors[up] = (colors[up]||0)+1
        total++
      })
    })
    return { socketGroups: groups, socketCounts: colors, totalSockets: total, largestLink: largest }
  }

  const buildTradeQueryFromParsed = (p:any) => {
    const rarity = (p.rarity||'').toLowerCase()
    const isUnique = rarity==='unique'
    const query:any = { query:{ status:{ option: onlineOnly ? 'online' : 'any' }, stats:[{ type:'and', filters:[] as any[] }], filters:{} as any }, sort:{ price:'asc' } }
    if (rarity==='unique') {
      if (p.name) query.query.name = p.name
      if (p.baseType && p.baseType!==p.name) query.query.type = p.baseType
    } else if (rarity==='rare') {
      // Ignore generated rare name to broaden pool; baseType only.
      if (p.baseType) query.query.type = p.baseType
      query.query.filters.type_filters = { filters: { rarity: { option:'rare' } } }
    } else {
      if (p.baseType) query.query.type = p.baseType
    }
  // Only include safe misc filters (avoid unknown/unsupported filter group names)
  const miscFilters:any = {}
  // clip input values from quick filters or parsed item
  const qMin = qualityMin ? parseInt(qualityMin) : (p.quality || undefined)
  const qMax = qualityMax ? parseInt(qualityMax) : undefined
  const iMin = ilvlMin ? parseInt(ilvlMin) : (p.itemLevel ? Math.max(1,p.itemLevel-2) : undefined)
  const iMax = ilvlMax ? parseInt(ilvlMax) : (p.itemLevel ? p.itemLevel : undefined)
  if (qMin !== undefined) miscFilters.quality = { min: qMin }
  if (iMin !== undefined || iMax !== undefined) miscFilters.ilvl = { min: iMin || 1, max: iMax || (iMin || 100) }
  if (linksMin) {
    const ln = parseInt(linksMin)
    if (!isNaN(ln)) miscFilters.links = { min: ln }
  }
  if (Object.keys(miscFilters).length) query.query.filters = { misc_filters: { filters: miscFilters } }
  // Price currency and rarity filter
  if (currencyFilter) {
    query.query.filters = { ...query.query.filters, trade_filters: { filters: { price: { option: currencyFilter } } } }
  }
  if (rarityFilter && rarityFilter !== 'any') {
    query.query.filters = { ...query.query.filters, type_filters: { filters: { rarity: { option: rarityFilter } } } }
  }
  // Note: avoid adding armor_filters, socket_filters, or influence_filters here — PoE rejects unknown groups.
  // Aggregate enabled stat lines into pseudo stats for broader similarity (prevents over-narrow queries)
  const agg: Record<string, number> = {}
  const add = (id:string,val:number)=> { if(!val||!isFinite(val)) return; agg[id]=(agg[id]||0)+val }
  const enabledLines = Object.values(statFilters).filter(st=> st.enabled)
  // Skip pseudo aggregation for unique items (name/type usually enough; mods vary widely and over-constrain search)
  if (!isUnique) enabledLines.forEach(st=> {
    const text = (st.text||'').toLowerCase()
    // numbers (first or max) for value extraction
    const nums = (text.match(/[-+]?[0-9]+(?:\.[0-9]+)?/g)||[]).map(Number)
    const first = nums[0]
    // Life / Mana / ES
    if (/to maximum life/.test(text) && !/%/.test(text)) add('pseudo.pseudo_total_life', first)
    if (/to maximum mana/.test(text) && !/%/.test(text)) add('pseudo.pseudo_total_mana', first)
    if (/to maximum energy shield/.test(text) && !/%/.test(text)) add('pseudo.pseudo_total_energy_shield', first)
    // Attributes
    if (/\bstrength\b/.test(text)) add('pseudo.pseudo_total_strength', first)
    if (/\bdexterity\b/.test(text)) add('pseudo.pseudo_total_dexterity', first)
    if (/\bintelligence\b/.test(text)) add('pseudo.pseudo_total_intelligence', first)
    if (/all attributes/.test(text)) add('pseudo.pseudo_total_all_attributes', first)
    // Resistances (single)
    if (/to fire resistance/.test(text)) add('pseudo.pseudo_total_fire_resistance', first)
    if (/to cold resistance/.test(text)) add('pseudo.pseudo_total_cold_resistance', first)
    if (/to lightning resistance/.test(text)) add('pseudo.pseudo_total_lightning_resistance', first)
    if (/to chaos resistance/.test(text)) add('pseudo.pseudo_total_chaos_resistance', first)
    if (/to all elemental resistances/.test(text)) add('pseudo.pseudo_total_elemental_resistance', first)
    if (/to fire and cold resistances/.test(text)) { add('pseudo.pseudo_total_fire_resistance', first); add('pseudo.pseudo_total_cold_resistance', first) }
    if (/to fire and lightning resistances/.test(text)) { add('pseudo.pseudo_total_fire_resistance', first); add('pseudo.pseudo_total_lightning_resistance', first) }
    if (/to cold and lightning resistances/.test(text)) { add('pseudo.pseudo_total_cold_resistance', first); add('pseudo.pseudo_total_lightning_resistance', first) }
    // Damage / speed / spell relevant
    if (/increased spell damage/.test(text)) add('pseudo.pseudo_increased_spell_damage', first)
    if (/increased cast speed/.test(text)) add('pseudo.pseudo_total_cast_speed', first)
    if (/increased attack speed/.test(text)) add('pseudo.pseudo_total_attack_speed', first)
    if (/movement speed/.test(text)) add('pseudo.pseudo_total_movement_speed', first)
  // NOTE: Spell critical strike chance pseudo stat id used earlier caused upstream error (unknown stat).
  // The trade API does not recognize 'pseudo.pseudo_total_spell_critical_strike_chance'. Until correct id is confirmed, omit it.
  })
  // If we captured individual elemental resistances but not explicit total, compute combined & add (PoE pseudo expects sum of %)
  if (!isUnique) {
    const eleSum = (agg['pseudo.pseudo_total_fire_resistance']||0)+(agg['pseudo.pseudo_total_cold_resistance']||0)+(agg['pseudo.pseudo_total_lightning_resistance']||0)
    if (eleSum>0 && !agg['pseudo.pseudo_total_elemental_resistance']) {
      agg['pseudo.pseudo_total_elemental_resistance'] = eleSum
    }
  }
  // Decide which resist filters to include: prefer total elemental if we have at least two elements contributing
  const elementCount = ['pseudo.pseudo_total_fire_resistance','pseudo.pseudo_total_cold_resistance','pseudo.pseudo_total_lightning_resistance'].filter(id=> agg[id]).length
  const filtersToEmit: Array<{id:string; value:{min:number}}>=[]
  if (!isUnique) Object.entries(agg).forEach(([id,val])=>{
    // Allowlist only known-safe pseudo stat ids to avoid upstream 'Unknown stat provided' errors.
    const allowed = new Set([
      'pseudo.pseudo_total_life',
      'pseudo.pseudo_total_mana',
      'pseudo.pseudo_total_energy_shield',
      'pseudo.pseudo_total_strength',
      'pseudo.pseudo_total_dexterity',
      'pseudo.pseudo_total_intelligence',
      'pseudo.pseudo_total_all_attributes',
      'pseudo.pseudo_total_fire_resistance',
      'pseudo.pseudo_total_cold_resistance',
      'pseudo.pseudo_total_lightning_resistance',
      'pseudo.pseudo_total_chaos_resistance',
      'pseudo.pseudo_total_elemental_resistance',
      'pseudo.pseudo_increased_spell_damage',
      'pseudo.pseudo_total_cast_speed',
      'pseudo.pseudo_total_attack_speed',
      'pseudo.pseudo_total_movement_speed'
    ])
    if (!allowed.has(id)) return
    if (id==='pseudo.pseudo_total_elemental_resistance' && elementCount>=2) {
      const min = Math.max(1, Math.floor(val*0.75))
      filtersToEmit.push({ id, value:{ min } })
    } else if (!id.startsWith('pseudo.pseudo_total_elemental_resistance')) {
      // Skip individual elements if we emitted total; else include them
      if (['pseudo.pseudo_total_fire_resistance','pseudo.pseudo_total_cold_resistance','pseudo.pseudo_total_lightning_resistance'].includes(id) && elementCount>=2) return
      const min = val>10? Math.floor(val*0.8): Math.max(1, Math.floor(val*0.7))
      filtersToEmit.push({ id, value:{ min } })
    }
  })
  if (filtersToEmit.length) {
    const validId = /^(pseudo\.|explicit\.|implicit\.|enchant\.|crafted\.|fractured\.|veiled\.|monster\.|delve\.|ultimatum\.|crucible\.)/i
    query.query.stats[0].filters.push(...filtersToEmit.filter(f=> validId.test(f.id)))
  }
  if (!query.query.stats[0].filters.length) delete query.query.stats
    return query
  }

  // Track dirty state when user modifies any stat filter
  useEffect(()=> {
    if (searchPerformed) setFiltersDirty(true)
  }, [statFilters, searchPerformed])

  const rerunSearchWithCurrentFilters = async () => {
    if (!parsed) return
    setError(null)
    setAutoStrippedPseudos(null)
  setApproximateResults(false)
  // Reset stale no-match state; we'll set back to true only if this run truly yields none
  setNoFilterMatch(false)
    setLoading(true)
    try {
      const p = parsed
  const hadPrevious = lastSuccessfulResults.length
      const query = buildTradeQueryFromParsed(p)
      setLastQuery(query)
      let searchResult: any
      let initialError: any = null
      try {
        searchResult = await poeApi.searchItems(selectedLeague, query)
        console.debug('[price-checker][rerun] primary result count', searchResult?.result?.length)
      } catch (err:any) {
        if (typeof err?.message === 'string' && err.message.startsWith('rate_limited:')) {
          const secs = parseInt(err.message.split(':')[1]||'0',10)
          setError(`Rate limited – wait ${secs}s before retrying.`)
          setLoading(false)
          return
        }
        initialError = err
        console.warn('[price-checker][rerun] primary error', err)
      }
      const isUnique = p.rarity && p.rarity.toLowerCase()==='unique'
      const isEmpty = (res:any) => (!res || !res.id || !Array.isArray(res.result) || !res.result.length)
      // Auto-strip pseudo filters if initial query failed or empty
      const hasPseudo = !!(query?.query?.stats?.[0]?.filters?.some((f:any)=> /^pseudo\./i.test(f.id)))
      if ((initialError || isEmpty(searchResult)) && hasPseudo) {
        const stripped = JSON.parse(JSON.stringify(query))
        if (stripped.query?.stats?.[0]?.filters) {
          stripped.query.stats[0].filters = stripped.query.stats[0].filters.filter((f:any)=> !/^pseudo\./i.test(f.id))
          if (!stripped.query.stats[0].filters.length) delete stripped.query.stats
        }
        try {
          const retry = await poeApi.searchItems(selectedLeague, stripped)
          if (!isEmpty(retry)) {
            searchResult = retry
            setLastQuery(stripped)
            setAutoStrippedPseudos({ reason: initialError? 'invalid query' : 'no matches' })
            console.debug('[price-checker][rerun] recovered after stripping pseudos', retry.result.length)
          }
        } catch {/* ignore */}
      }
      if (isEmpty(searchResult) && isUnique && query?.query?.stats) {
        const fallbackQuery = JSON.parse(JSON.stringify(query))
        delete fallbackQuery.query.stats
        try {
          const retry = await poeApi.searchItems(selectedLeague, fallbackQuery)
          if (!isEmpty(retry)) { searchResult = retry; setLastQuery(fallbackQuery) }
        } catch {/* ignore */}
      }
      if (isEmpty(searchResult) && !/^Standard$/i.test(selectedLeague)) {
        const stdQuery = JSON.parse(JSON.stringify(query))
        try {
          const retryStd = await poeApi.searchItems('Standard', stdQuery)
          if (!isEmpty(retryStd)) { searchResult = retryStd; }
        } catch {/* ignore */}
      }
      if (isEmpty(searchResult)) {
        if (query?.query?.status?.option === 'online') {
          const anyQuery = JSON.parse(JSON.stringify(query))
          if (anyQuery.query?.status) anyQuery.query.status.option = 'any'
          try {
            const retryAny = await poeApi.searchItems(selectedLeague, anyQuery)
            if (!isEmpty(retryAny)) { searchResult = retryAny; setLastQuery(anyQuery) }
          } catch {/* ignore */}
        }
      }
    if (isEmpty(searchResult)) {
        // No results after applying current filters & fallbacks.
        // If we have prior successful results + summary, preserve them instead of wiping Suggested price.
        if (lastSuccessfulResults.length && priceSummary) {
          setError('No listings for current filters (showing previous)')
          setNoFilterMatch(true)
          // Force searchResults to mirror lastSuccessful for any code paths reading it directly
            setSearchResults(lastSuccessfulResults)
          setFiltersDirty(false)
          // Don't clear previous summary / exact price; just abort rerun early.
      console.debug('[price-checker][rerun] early preserve previous results')
          return
        } else {
          setError('No listings found')
          setSearchResults([])
          setPriceSummary(null)
          setExactPrice(null)
      console.debug('[price-checker][rerun] no listings and nothing to preserve')
          return
        }
      }
      setTradeSearchId(searchResult.id || null)
      const allIds = searchResult.result
      const batchSize = 20
      let fetched: TradeItem[] = []
      let filteredDetails: TradeItem[] = []
      const testMatches = (item: TradeItem, relaxFactor = 1) => {
        const mods: string[] = []
        if (Array.isArray(item.item.implicitMods)) mods.push(...item.item.implicitMods)
        if (Array.isArray(item.item.explicitMods)) mods.push(...item.item.explicitMods)
        for (const st of Object.values(statFilters)) {
          if (!st.enabled) continue
          const needle = (st.text || '').toLowerCase()
          if (!needle) continue
          const found = mods.find(m=> m.toLowerCase().includes(needle))
          if (!found) return false
          const nums = (found.match(/[-+]?[0-9]+(?:\.[0-9]+)?/g) || []).map(Number)
          const minValOrig = st.min ? Number(st.min) : undefined
          const maxVal = st.max ? Number(st.max) : undefined
          const minVal = (minValOrig !== undefined) ? Math.floor(minValOrig * relaxFactor) : undefined
          if (minVal !== undefined) {
            const maxNum = nums.length ? Math.max(...nums) : undefined
            if (maxNum === undefined || maxNum < minVal) return false
          }
          if (maxVal !== undefined) {
            const minNum = nums.length ? Math.min(...nums) : undefined
            if (minNum === undefined || minNum > maxVal) return false
          }
        }
        return true
      }
      for (let offset=0; offset < allIds.length && offset < 200 && filteredDetails.length < 8; offset += batchSize) {
        const slice = allIds.slice(offset, offset + batchSize)
        const batch = await poeApi.getItemDetails(searchResult.id, slice)
        fetched = fetched.concat(batch)
        filteredDetails = fetched.filter(it=> testMatches(it, 1))
      }
      if (!filteredDetails.length) filteredDetails = fetched.filter(it=> testMatches(it, 0.9))
      if (!filteredDetails.length) filteredDetails = fetched.filter(it=> testMatches(it, 0.8))
      if (!filteredDetails.length) {
        for (let offset = fetched.length; offset < allIds.length && offset < 300 && !filteredDetails.length; offset += batchSize) {
          const slice = allIds.slice(offset, offset + batchSize)
          const batch = await poeApi.getItemDetails(searchResult.id, slice)
          fetched = fetched.concat(batch)
          filteredDetails = fetched.filter(it=> testMatches(it, 0.8))
        }
      }
      if (!filteredDetails.length) {
        // Preserve previous successful results & summary; mark no match state
        setNoFilterMatch(true)
        setFiltersDirty(false)
        if (lastSuccessfulResults.length) {
          setSearchResults(lastSuccessfulResults)
          console.debug('[price-checker][rerun] using lastSuccessfulResults', lastSuccessfulResults.length)
        } else if (fetched.length) {
          // As a last resort, surface approximate results (first few fetched) so user sees something
          const approx = fetched.slice(0, Math.min(12, fetched.length))
          setApproximateResults(true)
          setSearchResults(approx)
          setNoFilterMatch(false) // we are showing something (approximate)
          setError('No exact stat matches – showing closest recent listings.')
          console.debug('[price-checker][rerun] showing approximate fallback', approx.length)
        }
      } else {
        setNoFilterMatch(false)
        setSearchResults(filteredDetails)
        setLastSuccessfulResults(filteredDetails)
        try { const avg2 = await poeApi.averageListingPrice(filteredDetails, selectedLeague); setExactPrice(avg2) } catch {}
        await summarize(filteredDetails, selectedLeague)
        setFiltersDirty(false)
        if (autoStrippedPseudos) {
          setError('Auto-removed pseudo filters to recover results.')
        }
        console.debug('[price-checker][rerun] new filtered result set', filteredDetails.length)
      }
      // Safety: if after logic we still have zero displayed but had previous, fall back to previous
      if (!noFilterMatch && searchResults.length===0 && hadPrevious) {
        setNoFilterMatch(true)
        setSearchResults(lastSuccessfulResults)
        console.debug('[price-checker][rerun] safety fallback engaged', lastSuccessfulResults.length)
      }
    } catch (e:any) {
      console.error('Re-run pricing failed', e)
      const raw = e?.message || String(e)
      if ((raw||'').startsWith('rate_limited:')) {
        const secs = parseInt(raw.split(':')[1]||'0',10)
        setError(`Rate limited – wait ${secs}s before retrying.`)
      } else {
        setError('Re-run failed')
      }
      // Preserve last success on failure
      setNoFilterMatch(false)
    } finally { setLoading(false) }
  }

  // Enhanced price summarization with currency normalization & outlier handling (closer to poeprices behaviour)
  const summarize = async (items: TradeItem[], league: string) => {
    const priced = items.filter(i=> i.listing.price && typeof i.listing.price.amount==='number')
    if (!priced.length) { setPriceSummary(null); return }
    // Group by currency
    const buckets: Record<string, number[]> = {}
    priced.forEach(i=> {
      const cur = (i.listing.price!.currency||'chaos').toLowerCase()
      if (!buckets[cur]) buckets[cur] = []
      buckets[cur].push(i.listing.price!.amount)
    })
    // If all chaos just use directly; otherwise fetch conversion rates (reuse logic similar to averageListingPrice)
    let chaosValues: number[] = []
    const currencies = Object.keys(buckets)
    // Always fetch currency data so we can compute divine conversion & exchange rate
    let divineRate: number | null = null
    let rates: Record<string, number> = { chaosorb:1, chaos:1 }
    try {
      const data = await poeApi.getCurrencyData(league)
      data.forEach(d=> { if (typeof d.chaosEquivalent==='number') rates[d.currencyTypeName.toLowerCase().replace(/[^a-z]/g,'')] = d.chaosEquivalent })
      // Divine Orb detailsId sometimes 'divine-orb'; map by name
      const divineKey = Object.keys(rates).find(k=> /divine/.test(k))
      if (divineKey) divineRate = rates[divineKey]
    } catch {/* ignore */}
    if (currencies.length===1 && currencies[0].includes('chaos')) {
      chaosValues = buckets[currencies[0]].slice()
    } else {
      const norm = (s:string)=> s.toLowerCase().replace(/[^a-z]/g,'')
      const synonyms: Record<string,string> = { c:'chaos', chaosorb:'chaos', divineorb:'divine', divine:'divine', exa:'divine', exaltedorb:'divine' }
      currencies.forEach(cur=> {
        const key = norm(cur)
        const mapped = synonyms[key] || key
        const rate = rates[mapped] || (mapped==='chaos'?1: undefined)
        buckets[cur].forEach(a=> { if (rate) chaosValues.push(a * rate) })
      })
    }
    chaosValues = chaosValues.filter(v=> v>0 && isFinite(v))
    if (!chaosValues.length) { setPriceSummary(null); return }
    chaosValues.sort((a,b)=> a-b)
    const n = chaosValues.length
    // Compute quartiles
    const q = (p:number)=> { if (!n) return 0; const idx = (n-1)*p; const lo = Math.floor(idx); const hi=Math.ceil(idx); if (lo===hi) return chaosValues[lo]; const w=idx-lo; return chaosValues[lo]*(1-w)+chaosValues[hi]*w }
    const q1 = q(0.25); const q2 = q(0.5); const q3 = q(0.75)
    const iqr = q3 - q1
    // Remove Tukey outliers
    let filtered = chaosValues.filter(v=> v >= (q1 - 1.5*iqr) && v <= (q3 + 1.5*iqr))
    if (filtered.length < Math.min(5, n*0.6)) { // fallback if over-trimmed
      filtered = chaosValues.slice()
    }
    const m = filtered.length
    // Percentile helper on filtered
    const fq = (p:number)=> { if(!m) return 0; const idx=(m-1)*p; const lo=Math.floor(idx); const hi=Math.ceil(idx); if(lo===hi) return filtered[lo]; const w=idx-lo; return filtered[lo]*(1-w)+filtered[hi]*w }
    const minP = fq(Math.min(0.18, Math.max(0.1, 3/m))) // adaptive lower bound
    const maxP = fq(Math.max(0.82, 1-Math.max(0.1, 3/m)))
    const median = fq(0.5)
    const average = filtered.reduce((a,b)=>a+b,0)/m
    const trimmedAverage = (()=>{ const cut = Math.floor(m*0.1); if (m>=10) { const arr = filtered.slice(cut, m-cut); return arr.reduce((a,b)=>a+b,0)/arr.length } return average })()
    const dispersion = median ? (q3 - q1)/median : 0
    // Suggested: lean toward median unless distribution tight
    let suggested = median
    const relDiff = Math.abs(trimmedAverage - median)/Math.max(1, median)
    if (relDiff < 0.07) suggested = (median*0.4 + trimmedAverage*0.6) // smoothing
    // Confidence: sample size + inverse dispersion
    const sampleScore = Math.min(1, Math.log2(m+1)/5) // 5 => near 1
    const dispersionScore = Math.max(0, Math.min(1, 1 - dispersion/1.4))
    const confidence = Math.round((0.6*sampleScore + 0.4*dispersionScore)*100)

    // Auto currency conversion similar to awakened-poe-trade
    const toDisplay = (chaos:number): { amount:number; currency:'chaos'|'div' } => {
      if (!divineRate) return { amount: chaos, currency: 'chaos' }
      if (chaos > (divineRate * 0.94)) {
        // Near or above divine pricing threshold
        if (chaos < divineRate * 1.06) {
          return { amount: 1, currency: 'div' }
        } else {
          return { amount: chaos / divineRate, currency: 'div' }
        }
      }
      return { amount: chaos, currency: 'chaos' }
    }

    // Quick sell vs fair price strategy:
    // If confidence low or dispersion high, quick sell undercuts more.
    const dispersionFactor = Math.min(0.15, Math.max(0.05, dispersion * 0.4))
    const baseDiscount = (confidence < 50 ? 0.12 : confidence < 70 ? 0.09 : 0.07)
    const adaptiveDiscount = Math.max(baseDiscount, dispersionFactor)
    const quickSellChaos = suggested * (1 - adaptiveDiscount)
    const fairChaos = suggested
    const suggestedChaos = suggested // keep base

    setPriceSummary({
      min: minP,
      max: maxP,
      median,
      average,
      trimmedAverage,
      suggestedChaos,
      suggested: toDisplay(suggestedChaos),
      quickSell: toDisplay(quickSellChaos),
      fairPrice: toDisplay(fairChaos),
  quickSellChaos,
  fairPriceChaos: fairChaos,
      count: m,
      confidence,
      originalCount: n,
      removed: n - m,
      divRate: divineRate
    })
  }

  const formatPrice = (price: any) => {
    if (!price) return 'Not priced'
    const divRate = priceSummary?.divRate || null
    const cur = String(price.currency || '').toLowerCase()
    let chaosValue: number | undefined
    if (cur.includes('chaos') || cur==='c') chaosValue = price.amount
    else if (divRate && (cur.includes('div'))) chaosValue = price.amount * divRate
    if (chaosValue === undefined) return (<span className="currency-inline">{price.amount} {price.currency}</span>)
  if (priceDisplayMode === 'chaos') return <span className="currency-inline">{chaosValue.toFixed(2)} {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" style={iconStyle} onError={(e)=>{ if(e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />}</span>
    if (priceDisplayMode === 'equiv') {
  if (divRate && chaosValue > divRate * 0.94) return <span className="currency-inline">{chaosValue.toFixed(1)} {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" style={iconStyle} onError={(e)=>{ if(e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />} (<span style={{display:'inline-flex',alignItems:'center',gap:2}}>{(chaosValue/divRate).toFixed(2)} {divineIcon && <img src={divineIcon} alt="Divine Orb" title="Divine Orb" style={iconStyle} />}</span>)</span>
  return <span className="currency-inline">{chaosValue.toFixed(2)} {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" style={iconStyle} onError={(e)=>{ if(e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />}</span>
    }
    if (divRate && chaosValue > divRate * 0.94) {
  if (chaosValue < divRate * 1.06) return <span className="currency-inline">1 {divineIcon && <img src={divineIcon} alt="Divine Orb" title="Divine Orb" style={iconStyle} />}</span>
  return <span className="currency-inline">{(chaosValue/divRate).toFixed(2)} {divineIcon && <img src={divineIcon} alt="Divine Orb" title="Divine Orb" style={iconStyle} />}</span>
    }
  return <span className="currency-inline">{chaosValue.toFixed(2)} {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" style={iconStyle} onError={(e)=>{ if(e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />}</span>
  }

  const displayChaosValue = (chaos:number): React.ReactNode => {
    const divRate = priceSummary?.divRate || null
  if (priceDisplayMode === 'chaos') return <span className="currency-inline">{chaos.toFixed(1)} {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" style={iconStyle} onError={(e)=>{ if(e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />}</span>
    if (priceDisplayMode === 'equiv') {
  if (divRate && chaos > divRate * 0.94) return <span className="currency-inline">{chaos.toFixed(1)} {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" style={iconStyle} onError={(e)=>{ if(e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />} (<span style={{display:'inline-flex',alignItems:'center',gap:2}}>{(chaos/divRate).toFixed(2)} {divineIcon && <img src={divineIcon} alt="Divine Orb" title="Divine Orb" style={iconStyle} />}</span>)</span>
  return <span className="currency-inline">{chaos.toFixed(1)} {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" style={iconStyle} onError={(e)=>{ if(e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />}</span>
    }
    if (divRate && chaos > divRate * 0.94) {
  if (chaos < divRate * 1.06) return <span className="currency-inline">1 {divineIcon && <img src={divineIcon} alt="Divine Orb" title="Divine Orb" style={iconStyle} />}</span>
  return <span className="currency-inline">{(chaos/divRate).toFixed(2)} {divineIcon && <img src={divineIcon} alt="Divine Orb" title="Divine Orb" style={iconStyle} />}</span>
    }
  return <span className="currency-inline">{chaos.toFixed(1)} {chaosIcon && <img src={chaosIcon} alt="Chaos Orb" title="Chaos Orb" style={iconStyle} onError={(e)=>{ if(e.currentTarget.src!==CHAOS_ICON_FALLBACK) e.currentTarget.src=CHAOS_ICON_FALLBACK }} />}</span>
  }

  // Removed inline SVG CurrencyIcon (using actual game asset icons like currency tracker)

  // Cooldown ticker effect (persistent across refresh via localStorage stored timestamp per key)
  useEffect(()=>{
    if (!cooldownActiveKey) return
    let raf: number | null = null
    let lastFrame: number | null = null
    const tick = (ts:number) => {
      if (lastFrame==null) lastFrame = ts
      const elapsed = ts - lastFrame
      lastFrame = ts
      setCooldownRemaining(prev=> {
        const next = Math.max(0, prev - elapsed)
        if (next === 0) {
          // Clean up expired key in storage (optional; keep history limited)
          try {
            const raw = localStorage.getItem('price_check_cooldowns')
            if (raw) {
              const map = JSON.parse(raw)
              delete map[cooldownActiveKey]
              localStorage.setItem('price_check_cooldowns', JSON.stringify(map))
            }
          } catch {}
        }
        return next
      })
      if (cooldownRemaining > 0) raf = requestAnimationFrame(tick)
    }
    if (cooldownRemaining > 0) raf = requestAnimationFrame(tick)
    return ()=> { if (raf) cancelAnimationFrame(raf) }
  }, [cooldownActiveKey])

  // Restore active cooldown on mount (page refresh) so timer persists
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('price_check_cooldowns')
      const active = localStorage.getItem('price_check_active_key')
      if (raw && active) {
        const map = JSON.parse(raw)
        const ts = map[active]
        if (typeof ts === 'number') {
          const elapsed = Date.now() - ts
            if (elapsed < COOLDOWN_MS) {
              setCooldownActiveKey(active)
              setCooldownRemaining(COOLDOWN_MS - elapsed)
            } else {
              // Cleanup expired
              delete map[active]
              localStorage.setItem('price_check_cooldowns', JSON.stringify(map))
              localStorage.removeItem('price_check_active_key')
            }
        }
      }
    } catch {}
  }, [])

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
      {/* Upstream 403 guidance banner */}
      {forbiddenMeta && (
        <div style={{
          background:'linear-gradient(145deg,#3b1e1e,#2a1212)',
          border:'1px solid #6a2c2c',
          padding:'10px 14px',
          marginBottom:14,
          borderRadius:8,
          boxShadow:'0 0 0 1px #000, inset 0 0 12px rgba(0,0,0,.6)'
        }}>
          <div style={{fontWeight:600,color:'#ffb4b4',marginBottom:4,fontSize:13}}>Trade API Forbidden (HTTP 403)</div>
          <div style={{fontSize:12,lineHeight:1.4,color:'#f1dada'}}>
            The official trade site is blocking this server's IP (Cloudflare / anti-bot).{ ' ' }
            {forbiddenMeta.hint && <><br/>Hint: {forbiddenMeta.hint}</>}
            {!forbiddenMeta.sessionAttached && <><br/>Session cookie not attached. You can provide a POE_TRADE_SESSION_ID env var (value of your POESESSID cookie) on the server to reduce blocking. Do NOT expose it client-side.</>}
            <br/>Options:
            <ul style={{margin:'6px 0 4px 18px',padding:0}}>
              <li>Open https://www.pathofexile.com/trade in a browser while logged in (refresh cookies) then retry.</li>
              <li>Set server env POE_TRADE_SESSION_ID to your POESESSID (private) and redeploy.</li>
              <li>Run locally / self-host with a residential IP.</li>
              <li>Implement an external proxy with caching & allow-list (optional).</li>
            </ul>
            Until resolved you can still paste items to get ML estimate from poeprices.info (if available) and manual valuation using poe.ninja reference values.
            {fallbackPrice && (
              <div style={{marginTop:8,padding:'6px 8px',background:'#442626',border:'1px solid #6d3a3a',borderRadius:6}}>
                <strong>Fallback (poe.ninja)</strong>: ~{fallbackPrice.chaos.toFixed(1)} chaos (matched {fallbackPrice.matched} in {fallbackPrice.source})
              </div>
            )}
          </div>
          <button onClick={()=> setForbiddenMeta(null)} style={{marginTop:8,fontSize:11,background:'#532',color:'#ffd7d7',border:'1px solid #7a4636',padding:'4px 10px',borderRadius:6,cursor:'pointer'}}>Dismiss</button>
        </div>
      )}
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <div className="segmented">
          <button className={mode==='clipboard'? 'active':''} onClick={()=>persistMode('clipboard')}>Clipboard Paste</button>
          <button className={mode==='simple'? 'active':''} onClick={()=>persistMode('simple')}>Simple Name</button>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
          {/* Cooldown progress (replaces removed league pill) */}
          {cooldownRemaining > 0 && (
            <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:180,position:'relative'}}>
              <div style={{position:'relative',height:6,background:'#2a2a2a',borderRadius:6,overflow:'hidden',boxShadow:'0 0 0 1px #000,inset 0 0 4px rgba(0,0,0,.6)'}} aria-label="Item price check cooldown" role="progressbar" aria-valuemin={0} aria-valuemax={COOLDOWN_MS/1000} aria-valuenow={Math.ceil(cooldownRemaining/1000)}>
                <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,#b47a2d,#7d531f)',transform:`translateX(-${100 - (cooldownRemaining/COOLDOWN_MS*100)}%)`,transition:'transform 1s linear'}} />
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,letterSpacing:.5,color:'#d6d6d6',alignItems:'center'}}>
                <span style={{opacity:.7,display:'inline-flex',alignItems:'center',gap:4}}>
                  Cooldown
                  <span
                    role="img"
                    aria-label={COOLDOWN_TOOLTIP}
                    title={COOLDOWN_TOOLTIP}
                    style={{
                      display:'inline-flex',
                      width:18,
                      height:18,
                      cursor:'help',
                      alignItems:'center',
                      justifyContent:'center',
                      borderRadius:'50%',
                      background:'linear-gradient(145deg,#262626,#1b1b1b)',
                      boxShadow:'0 0 0 1px #3f2d16, 0 0 4px rgba(0,0,0,.7), inset 0 0 4px rgba(255,180,80,0.15)',
                      position:'relative',
                      transition:'box-shadow .2s, transform .2s'
                    }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.boxShadow='0 0 0 1px #b47a2d, 0 0 6px 2px rgba(180,122,45,.55), inset 0 0 6px rgba(255,200,120,.25)' }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.boxShadow='0 0 0 1px #3f2d16, 0 0 4px rgba(0,0,0,.7), inset 0 0 4px rgba(255,180,80,0.15)' }}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" style={{filter:'drop-shadow(0 0 3px rgba(180,122,45,.55))'}}>
                      <defs>
                        <radialGradient id="cooldownInfoGold" cx="30%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#ffe3b0" />
                          <stop offset="55%" stopColor="#d5a04e" />
                          <stop offset="100%" stopColor="#7d531f" />
                        </radialGradient>
                      </defs>
                      <circle cx="12" cy="12" r="10" fill="url(#cooldownInfoGold)" stroke="#b47a2d" strokeWidth="1.2" />
                      <path d="M12 10.4v6.2" stroke="#1a1205" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="7.4" r="1.25" fill="#1a1205" />
                    </svg>
                  </span>
                </span>
                <strong>{Math.ceil(cooldownRemaining/1000)}s</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {mode==='clipboard' && (
        <div style={{background:'#080808',border:'1px solid #232323',borderRadius:8,padding:12,marginBottom:16}}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Paste box + toolbar (matches poeprices query flow). The compact item preview is rendered to the right after the user submits. */}
            <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
              <div style={{background:'#0b0b0b',border:'1px solid #222',padding:6,borderRadius:8,width:520}}>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                  <label htmlFor="priceDisplayMode" style={{fontSize:11,opacity:.7,letterSpacing:.5}}>Buyout Price</label>
                  <select id="priceDisplayMode" value={priceDisplayMode} onChange={e=> setPriceDisplayMode(e.target.value as any)} style={{background:'#1e1e1e',border:'1px solid #333',color:'#ddd',fontSize:12,padding:'4px 6px',borderRadius:6}}>
                    <option value="chaos">Chaos</option>
                    <option value="auto">Chaos/Div</option>
                    <option value="equiv">Chaos ≡</option>
                  </select>
                  <div style={{marginLeft:'auto',display:'flex',gap:8}}>
                    <button onClick={handleSearch} disabled={loading || !rawClipboard.trim()} style={btnStylePrimary}>Submit</button>
                    <button
                      onClick={()=>{
                        setRawClipboard('');
                        setParsed(null);
                        setStatFilters({});
                        setSearchResults([]);
                        setPriceSummary(null);
                        setError(null);
                        setSearchPerformed(false);
                        resetCooldown(); // also clear cooldown so a new pasted item can be searched immediately
                      }}
                      style={btnStyle}
                    >Reset</button>
                  </div>
                </div>
                <textarea
                  placeholder="Paste item text here (Ctrl+C in game, then Ctrl+V)"
                  value={rawClipboard}
                    onChange={e=> { const v=e.target.value; setRawClipboard(v); if(!v.trim()){ // if user clears box we also clear cooldown to allow immediate fresh search
                      resetCooldown(); setParsed(null); setSearchResults([]); setPriceSummary(null); setError(null); setSearchPerformed(false); }
                  }}
                  rows={5}
                  style={{width:'100%',background:'#070707',border:'1px solid #111',color:'#ddd',padding:8,fontFamily:'Consolas, monospace',fontSize:12,borderRadius:6,resize:'vertical'}}
                />
                {parsed && (parsed.implicits?.length || parsed.explicits?.length) && (
                  <div style={{marginTop:10,background:'#121212',border:'1px solid #262626',borderRadius:8,padding:'10px 12px 12px',fontSize:11,lineHeight:1.5,color:'#d0d0d0',fontFamily:'Consolas, monospace',position:'relative'}}>
                    <div style={{display:'flex',alignItems:'center'}}>
                      <div style={{fontSize:10,letterSpacing:.8,opacity:.65}}>ITEM MODIFIERS (Placeholders)</div>
                      <div
                        onMouseEnter={()=>setShowModHelp(true)}
                        onMouseLeave={()=>setShowModHelp(false)}
                        aria-label="Explain modifiers"
                        title="Explain modifiers"
                        style={{
                          marginLeft:'auto',
                          cursor:'help',
                          width:18,
                          height:18,
                          borderRadius:9,
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          background:'linear-gradient(145deg,#262626,#1b1b1b)',
                          boxShadow:'0 0 0 1px #3f2d16, 0 0 4px rgba(0,0,0,.7), inset 0 0 4px rgba(255,180,80,0.15)',
                          transition:'box-shadow .2s'
                        }}
                        onMouseOver={e=>{ (e.currentTarget as HTMLElement).style.boxShadow='0 0 0 1px #b47a2d, 0 0 6px 2px rgba(180,122,45,.55), inset 0 0 6px rgba(255,200,120,.25)' }}
                        onMouseOut={e=>{ (e.currentTarget as HTMLElement).style.boxShadow='0 0 0 1px #3f2d16, 0 0 4px rgba(0,0,0,.7), inset 0 0 4px rgba(255,180,80,0.15)' }}
                      >
                        <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true" style={{filter:'drop-shadow(0 0 2px rgba(180,122,45,.5))'}}>
                          <defs>
                            <radialGradient id="modHelpGold" cx="30%" cy="30%" r="70%">
                              <stop offset="0%" stopColor="#ffe3b0" />
                              <stop offset="55%" stopColor="#d5a04e" />
                              <stop offset="100%" stopColor="#7d531f" />
                            </radialGradient>
                          </defs>
                          <circle cx="12" cy="12" r="10" fill="url(#modHelpGold)" stroke="#b47a2d" strokeWidth="1.2" />
                          <path d="M12 10.4v6.2" stroke="#1a1205" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="12" cy="7.4" r="1.25" fill="#1a1205" />
                        </svg>
                      </div>
                      {showModHelp && (
                        <div style={{position:'absolute',top:30,right:8,zIndex:10,background:'#161616',border:'1px solid #2d2d2d',borderRadius:8,padding:'10px 12px',width:300,lineHeight:1.4,boxShadow:'0 4px 18px rgba(0,0,0,.6)'}}>
                          <div style={{fontSize:11,color:'#d8d8d8'}}>
                            <b>What are these?</b><br/>
                            Each line is an item modifier with numbers replaced by <b>#</b> (and <b>#%</b>) so you can focus on the pattern, not exact roll.<br/><br/>
                            <b>Prefixes vs Suffixes</b><br/>
                            Prefixes usually give core defenses, attributes, life, mana or ES. Suffixes tend to supply damage, speed, crit or resistances. We infer this heuristically – actual crafting tags can differ.<br/><br/>
                            <b>Why show them?</b><br/>
                            Helps you quickly judge: remaining crafting potential, distribution of defensive vs offensive stats, and which pseudo totals (resists / attributes / ES) influenced pricing.
                          </div>
                        </div>
                      )}
                    </div>
                    {parsed.implicits?.length>0 && (
                      <div style={{marginTop:6,marginBottom:8}}>
                        <div style={{fontSize:10,letterSpacing:.5,opacity:.55,marginBottom:4}}>IMPLICITS</div>
                        {parsed.implicits.map((m:string,i:number)=> (
                          <div key={i} style={{color:'#b8a46a'}}>{normalizeModLine(m)}</div>
                        ))}
                        <div style={{height:1,background:'linear-gradient(90deg,#444,#222 70%)',margin:'8px 0 2px'}} />
                      </div>
                    )}
                    {(() => {
                      const explicits: string[] = parsed.explicits || []
                      if (!explicits.length) return null
                      const prefixKeywords = /(life|max life|mana|energy shield|armour|evasion|resistance|all attributes|strength|dexterity|intelligence|suppress|block|recovery)/i
                      const suffixKeywords = /(attack speed|cast speed|critical|crit|damage|projectile|minion|penetration|spell damage|ailment|chaos damage|area of effect|duration)/i
                      const prefixes: string[] = []
                      const suffixes: string[] = []
                      explicits.forEach(l=> {
                        const low = l.toLowerCase()
                        if (prefixKeywords.test(low) && !suffixKeywords.test(low)) prefixes.push(l)
                        else if (suffixKeywords.test(low) && !prefixKeywords.test(low)) suffixes.push(l)
                        else {
                          if (/(life|resistance|energy shield|armour|evasion)/i.test(l)) { prefixes.push(l) } else { suffixes.push(l) }
                        }
                      })
                      return (
                        <div>
                          <div style={{fontSize:10,letterSpacing:.5,opacity:.55,margin:'4px 0'}}>PREFIXES (heuristic)</div>
                          {prefixes.length? prefixes.map((m,i)=>(<div key={i} style={{color:'#8ab4ff'}}>{normalizeModLine(m)}</div>)) : <div style={{opacity:.35}}>—</div>}
                          <div style={{height:1,background:'linear-gradient(90deg,#333,#1c1c1c 70%)',margin:'8px 0 6px'}} />
                          <div style={{fontSize:10,letterSpacing:.5,opacity:.55,margin:'4px 0'}}>SUFFIXES (heuristic)</div>
                          {suffixes.length? suffixes.map((m,i)=>(<div key={i} style={{color:'#9fe3b4'}}>{normalizeModLine(m)}</div>)) : <div style={{opacity:.35}}>—</div>}
                        </div>
                      )
                    })()}
                    <div style={{marginTop:10,fontSize:10,opacity:.4}}>Numbers replaced with #; grouping is approximate for quick appraisal.</div>
                  </div>
                )}
                {priceSummary && (
                  <div style={{background:'#141414',border:'1px solid #2a2a2a',padding:'12px 14px',borderRadius:8,marginTop:12}}>
                        <div style={{display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}}>
                      <div style={{fontSize:13,letterSpacing:.5,opacity:.85}}>{priceDisplayMode==='chaos'? 'Estimated Price Range (Chaos)' : priceDisplayMode==='auto'? 'Estimated Price Range (Chaos / Div)' : 'Estimated Price Range (Chaos Equivalent)'}</div>
                        <div style={{display:'flex',gap:14,fontSize:12}}>
                        <div><span style={{opacity:.55}}>Min</span><div style={{fontWeight:600}}>{displayChaosValue(priceSummary.min)}</div></div>
                        <div><span style={{opacity:.55}}>Median</span><div style={{fontWeight:600}}>{displayChaosValue(priceSummary.median)}</div></div>
                        <div><span style={{opacity:.55}}>Avg</span><div style={{fontWeight:600}}>{displayChaosValue(priceSummary.average)}</div></div>
                        <div><span style={{opacity:.55}}>Max</span><div style={{fontWeight:600}}>{displayChaosValue(priceSummary.max)}</div></div>
                        <div><span style={{opacity:.55}}>Suggested</span><div style={{fontWeight:600,color:'#57d977'}}>{displayChaosValue(priceSummary.suggestedChaos)}</div></div>
                        <div><span style={{opacity:.55}}>Quick Sell</span><div style={{fontWeight:600,color:'#ffb347'}}>{displayChaosValue(priceSummary.quickSellChaos || priceSummary.suggestedChaos)}</div></div>
                        <div><span style={{opacity:.55}}>Fair</span><div style={{fontWeight:600,color:'#a0d8ff'}}>{displayChaosValue(priceSummary.fairPriceChaos || priceSummary.suggestedChaos)}</div></div>
                        {poePriceResult && <div><span style={{opacity:.55}}>PoePrice</span><div style={{fontWeight:600,color:'#67bfff'}}>{displayChaosValue(poePriceResult.min)} – {displayChaosValue(poePriceResult.max)}</div></div>}
                      </div>
                      <div style={{marginLeft:'auto',fontSize:10,opacity:.5,display:'flex',gap:8,alignItems:'center'}}>
                        <span>Heuristic • Conf {priceSummary.confidence}% • Trim {priceSummary.trimmedAverage.toFixed(1)} • Div≈{priceSummary.divRate? priceSummary.divRate.toFixed(1):'?' }c</span>
                        {tradeSearchId && <a href={`https://www.pathofexile.com/trade/search/${encodeURIComponent(selectedLeague)}/${tradeSearchId}`} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:'#67bfff',textDecoration:'none'}}>Trade ↗</a>}
                      </div>
                    </div>
                      {poePriceNote && (
                        <div style={{fontSize:10,marginTop:4,color:'#999'}}>{poePriceNote}</div>
                      )}
                      {autoStrippedPseudos && (
                        <div style={{fontSize:11,marginTop:4,color:'#57d977'}}>Broadened search automatically (combined stat totals had no direct matches).</div>
                      )}
                    <div style={{marginTop:8}}>
                      <button onClick={()=>setShowExplain(s=>!s)} style={{background:'none',border:'none',color:'#6aa9ff',fontSize:11,cursor:'pointer',padding:0}}>{showExplain? 'Hide':'How was this priced?'}{showExplain? ' ▲':' ▼'}</button>
                      {showExplain && (
                        <div style={{marginTop:6,fontSize:11,lineHeight:1.4,color:'#ccc'}}>
                          <div>We gathered <b>{priceSummary.originalCount}</b> recent listings matching your checked stats.</div>
                          {priceSummary.removed>0 && (
                            <div>Removed <b>{priceSummary.removed}</b> outlier price(s) using IQR (values far outside the central 50%).</div>
                          )}
                          <div><b>Median</b> ({priceSummary.median.toFixed(1)}c) is the middle chaos value; <b>Avg</b> is the simple mean ({priceSummary.average.toFixed(1)}c).</div>
                          <div>We also compute a <b>trimmed avg</b> ({priceSummary.trimmedAverage.toFixed(1)}c) after dropping 10% high/low when enough data.</div>
                          <div><b>Suggested</b> blends median & trimmed avg if close. <b>Quick Sell</b> undercuts by an adaptive {(() => {
                            // Compute undercut percent relative to suggestedChaos baseline.
                            if (!priceSummary) return '?'
                            const chaosValueQuick = priceSummary.quickSell.currency === 'div' && priceSummary.divRate ? priceSummary.quickSell.amount * priceSummary.divRate : priceSummary.quickSell.amount
                            const pct = 1 - (chaosValueQuick / priceSummary.suggestedChaos)
                            return (pct*100).toFixed(1)
                          })()}% for faster sale.</div>
                          <div><b>Confidence {priceSummary.confidence}%</b> grows with more samples and tighter spread. Divine conversion shown when near/above ~1 divine.</div>
                          <div style={{opacity:.7}}>Uncheck stats to broaden the pool; re-check to narrow it.</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* {exactPrice && (
                  <div style={{marginTop:12,background:'#0f1112',border:'1px solid #2b2b2b',padding:10,borderRadius:8}}>
                    <div style={{display:'flex',alignItems:'center'}}>
                      <div style={{fontSize:11,opacity:.6,marginRight:12}}>Suggested</div>
                      <div style={{fontSize:16,fontWeight:700,color:'#57d977'}}>{exactPrice.average.toFixed(1)} {exactPrice.currency}</div>
                      <div style={{marginLeft:'auto',fontSize:10,opacity:.55}}>Live listing average</div>
                    </div>
                  </div>
                )} */}


                  {/* Listings table */}
                  {(!noFilterMatch ? searchResults : lastSuccessfulResults).length>0 && (
                    <div style={{marginTop:16}}>
                      <div style={{display:'flex',alignItems:'center',gap:16,fontSize:12,opacity:.8,marginBottom:6}}>
                        <div>Matched: {noFilterMatch ? 0 : searchResults.length}</div>
                        <div>•</div>
                        <div style={{ color: '#57d977' }}>Online</div>
                      </div>
                      <div style={{background:'#0c0c0c',border:'1px solid #1a1a1a',borderRadius:6,overflow:'hidden'}}>
                        <div style={{display:'grid',gridTemplateColumns:'120px 1fr',fontSize:11,background:'#111',padding:'6px 10px',color:'#bbb',letterSpacing:.5}}>
                          <div style={{fontWeight:600}}>PRICE</div>
                          <div style={{fontWeight:600}}>LISTED</div>
                        </div>
                        <div style={{maxHeight:260,overflowY:'auto'}}>
                          {(noFilterMatch ? lastSuccessfulResults : searchResults).slice(0,40).map((it,idx)=> (
                            <div key={it.id||idx} style={{display:'grid',gridTemplateColumns:'120px 1fr',padding:'6px 10px',fontSize:12,background: idx%2? '#0a0a0a':'transparent'}}>
                              <div style={{whiteSpace:'nowrap'}}>{formatPrice(it.listing?.price)}</div>
                              <div style={{opacity:.7}}>{formatTimeAgo(it.listing?.indexed||'')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {noFilterMatch && (
                        <div style={{marginTop:8,fontSize:11,opacity:.7}}>No listings match current filters; showing last results. Loosen thresholds or uncheck more stats.</div>
                      )}
                    </div>
                  )}
              </div>


              {/* Right-side mod box + listings */}
              {searchPerformed && parsed && (
                <div style={{display:'flex',flexDirection:'column',gap:12,flex:1,maxWidth:760}}>
                  {parsed && (
                      <div style={{background:'#0b0b0b',border:'1px solid #232323',borderRadius:6,padding:12,color:'#ddd',marginTop:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                          <div style={{fontSize:12,letterSpacing:.6}}>
                            <div style={{opacity:.7,fontSize:11}}>CATEGORY</div>
                            <div style={{fontWeight:800,fontSize:13,marginTop:4}}>{parsed?.itemClass || parsed?.baseType || '—'}</div>
                            {/* Rarity-colored name block */}
                            {(() => {
                              const rarity = (parsed?.rarity||'').toLowerCase()
                              const colors:Record<string,string>={ normal:'#ffffff', magic:'#6aa9ff', rare:'#e6d56a', unique:'#af6025', currency:'#d8d8d8', gem:'#1ba29b' }
                              const col = colors[rarity] || '#ddd'
                              const nameLine = parsed?.name || parsed?.baseType || ''
                              const baseLine = parsed?.baseType && parsed?.name && parsed?.name!==parsed?.baseType ? parsed?.baseType : ''
                              return (
                                <div style={{marginTop:6,lineHeight:1.15}}>
                                  <div style={{fontSize:13,fontWeight:700,color:col}}>{nameLine}</div>
                                  {baseLine && <div style={{fontSize:11,opacity:.75}}>{baseLine}</div>}
                                </div>
                              )
                            })()}
                          </div>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                            <div style={{fontSize:12,opacity:.65}}>{parsed?.corrupted ? 'Corrupted' : 'Not Corrupted'}</div>
                            {searchPerformed && (
                              <div>
                                <button onClick={rerunSearchWithCurrentFilters} disabled={loading || !filtersDirty} style={{background: filtersDirty? 'linear-gradient(90deg,#7d531f,#b47a2d)':'#333',border:'1px solid #444',color:'#eee',padding:'4px 10px',borderRadius:14,fontSize:11,cursor: filtersDirty? 'pointer':'not-allowed'}}>
                                  {loading? 'Running...' : filtersDirty? 'Re-run Search' : 'Up to date'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
                          {/* Sockets & Links pill */}
                          <div style={{padding:'6px 8px',background:'#0c0c0c',border:'1px solid #1a1a1a',borderRadius:8,fontSize:12,display:'flex',alignItems:'center',gap:6}}>
                            {(() => {
                              const info:any = (parsed as any)?.socketInfo
                              if (!parsed?.sockets) return <span>SOCKETS: —</span>
                              const colorsInline = info?.socketGroups ? info.socketGroups.map((grp:string[],gi:number)=> (
                                <span key={gi} style={{display:'inline-block',marginRight:gi<info.socketGroups.length-1?4:0}}>
                                  {grp.map((c:string,i:number)=> {
                                    const colorMap:Record<string,string>={R:'#ff5555',G:'#6aff6a',B:'#4aa8ff',W:'#ddd',A:'#9b65ff'}
                                    return <span key={i} style={{color:colorMap[c]||'#ccc'}}>{c}{i<grp.length-1 && <span style={{color:'#555'}}>-</span>}</span>
                                  })}
                                </span>
                              )) : parsed.sockets
                              const linkLabel = info?.largestLink ? info.largestLink : (parsed.links || '-')
                              return <>
                                <span style={{opacity:.65}}>SOCKETS:</span> {colorsInline} <span style={{opacity:.4,marginLeft:6}}>L:{linkLabel}</span>
                              </>
                            })()}
                          </div>
                          <div style={{padding:'6px 8px',background:'#0c0c0c',border:'1px solid #1a1a1a',borderRadius:8,fontSize:12}}>ITEM LEVEL: {parsed?.itemLevel || '—'}</div>
                          <div style={{padding:'6px 8px',background:'#0c0c0c',border:'1px solid #1a1a1a',borderRadius:8,fontSize:12}}>
                            {Object.values(statFilters).filter(st=> st.enabled).length} of {Object.keys(statFilters).length} STATS
                          </div>
                        </div>

                        {/* Pseudo mods section */}
                        {pseudoMods.length>0 && (
                          <div style={{marginTop:14,marginBottom:6,borderTop:'1px solid #222',paddingTop:10,display:'flex',flexDirection:'column',gap:4}}>
                            {pseudoMods.map(pm=> (
                                  <div key={pm.id} style={{padding:'6px 10px',background:'#060606',border:'1px solid #141414',borderRadius:6,display:'flex',alignItems:'center',gap:10}}>
                                    <input type="checkbox" defaultChecked onChange={(e)=>{
                                      // When unchecked, remove its contribution by disabling related base stats heuristically (not stored separately yet)
                                      if (!e.target.checked) {
                                        // For now nothing else: future improvement could mark a separate pseudoFilters state
                                      }
                                    }} style={{marginTop:0}} />
                                    <div style={{flex:1,fontSize:12,color:'#deb76c'}}>{pm.text}</div>
                                    <div style={{display:'flex',gap:6}}>
                                      <input defaultValue={pm.value} style={{width:60,background:'#0c0c0c',border:'1px solid #222',color:'#ddd',padding:'4px 6px',borderRadius:4,fontSize:12,textAlign:'center'}} />
                                      <input placeholder="max" style={{width:56,background:'#0c0c0c',border:'1px solid #222',color:'#ddd',padding:'4px 6px',borderRadius:4,fontSize:12,textAlign:'center'}} />
                                    </div>
                                  </div>
                                ))}
                            <div style={{height:1,background:'#222',margin:'8px 0 4px'}} />
                          </div>
                        )}

                        <div style={{marginTop:4,display:'flex',flexDirection:'column',gap:4}}>
                          {Object.keys(statFilters).length ? (
                            Object.entries(statFilters)
                              .filter(([id,st])=> !(hideCrafted && /crafted/i.test(String(st.text || ''))))
                              .slice(0,9)
                              .map(([id,st],idx)=>{
                                const raw = st.text || ((parsed?.implicits||[]).concat(parsed?.explicits||[]))[idx] || ''
                                const isImplicit = st.source==='implicit' || idx < (parsed?.implicits?.length||0)
                                const nums = (raw.match(/[-+]?[0-9]+(?:\.[0-9]+)?/g) || []).map((n:string)=>Number(n))
                                const minNum = nums.length? Math.min(...nums): undefined
                                const maxNum = nums.length? Math.max(...nums): undefined
                                const currentVal = st.min ? Number(st.min) : (maxNum || '')
                                const pct = (minNum!==undefined && maxNum!==undefined && currentVal!==undefined && typeof currentVal==='number') ? ((currentVal - minNum)/(Math.max(1,(maxNum-minNum))) ) : 0.5
                                return (
                                  <div key={id} style={{padding:'8px 10px 10px',background:'#070707',border:'1px solid #141414',borderRadius:6}}>
                                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                                      <input type="checkbox" checked={st.enabled} onChange={(e)=> setStatFilters(prev=> ({...prev,[id]:{...st,enabled:e.target.checked}}))} />
                                      <div style={{flex:1}}>
                                        <div style={{fontSize:13,fontWeight:600,color: isImplicit ? '#88aaff' : '#ffff77'}}>{raw}</div>
                                      </div>
                                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                                        <input
                                          value={st.quality}
                                          onChange={(e)=> setStatFilters(prev=> ({...prev,[id]:{...st,quality:e.target.value}}))}
                                          placeholder="Q %"
                                          style={{width:50,background:'#0c0c0c',border:'1px solid #222',color:'#ddd',padding:'4px 4px',borderRadius:4,fontSize:12,textAlign:'center'}}
                                        />
                                        <input
                                          value={st.min}
                                          onChange={(e)=> setStatFilters(prev=> ({...prev,[id]:{...st,min:e.target.value}}))}
                                          placeholder={minNum!==undefined? String(minNum): 'min'}
                                          style={{width:56,background:'#0c0c0c',border:'1px solid #222',color:'#ddd',padding:'4px 6px',borderRadius:4,fontSize:12,textAlign:'center'}}
                                        />
                                        <input
                                          value={st.max}
                                          onChange={(e)=> setStatFilters(prev=> ({...prev,[id]:{...st,max:e.target.value}}))}
                                          placeholder="Max"
                                          style={{width:56,background:'#0c0c0c',border:'1px solid #222',color:'#ddd',padding:'4px 6px',borderRadius:4,fontSize:12,textAlign:'center'}}
                                        />
                                      </div>
                                    </div>
                                    <div style={{marginTop:6,position:'relative',height:18}}>
                                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center'}}>
                                        <div style={{flex:1,height:4,background:'linear-gradient(90deg,#222,#111)'}}>
                                          <div style={{height:4,background:'#5c9ded',width:`${Math.min(100,Math.max(0,pct*100))}%`}} />
                                        </div>
                                      </div>
                                      <div style={{position:'absolute',top:10,left:0,fontSize:10,opacity:.6}}>{minNum!==undefined? minNum: ''}</div>
                                      <div style={{position:'absolute',top:10,right:0,fontSize:10,opacity:.6}}>{maxNum!==undefined? maxNum: ''}</div>
                                    </div>
                                  </div>
                                )
                              })
                          ) : (
                            <div style={{fontSize:12,opacity:.7}}>No mods to preview</div>
                          )}
                        </div>

                        {/* Control bar removed per request */}
                      </div>
                  )}

                </div>
              )}
                {approximateResults && !autoStrippedPseudos && (
                  <div style={{marginTop:8,fontSize:11,opacity:.75,color:'#d8d8d8'}}>Approximate fallback: strict filters had zero matches; displaying nearest recent listings.</div>
                )}
            </div>
          </div>
        </div>
      )}

      {mode==='simple' && (
        <div style={{background:'#080808',border:'1px solid #232323',borderRadius:8,padding:12,marginBottom:16}}>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <div className="search-container flex-1">
              <div className="search-icon">🔍</div>
              <input
                    type="text"
                    placeholder="Search items (e.g. Mageblood, Headhunter)"
                    value={searchTerm}
                    onChange={(e) => { const val = e.target.value; setSearchTerm(val); if(!val.trim()){ resetCooldown(); setSearchResults([]); setPriceSummary(null); setExactPrice(null); setError(null); setSearchPerformed(false); } }}
                    onKeyDown={handleKeyPress}
                    className="search-input"
                    style={{background:'#0c0c0c',border:'1px solid #222',color:'#ddd',padding:6,borderRadius:6,width:'100%'}}
                  />
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'center',marginTop:12}}>
            <button onClick={handleSearch} disabled={loading || !searchTerm.trim()} style={btnStylePrimary}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
          <div style={{marginTop:10,display:'flex',justifyContent:'center',gap:12}}>
            {priceSummary && <div style={{fontSize:12,opacity:.8}}>{priceSummary.count} priced • Avg {priceSummary.average.toFixed(1)}c</div>}
            {tradeSearchId && <a href={`https://www.pathofexile.com/trade/search/${encodeURIComponent(selectedLeague)}/${tradeSearchId}`} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#67bfff',textDecoration:'none'}}>Open Trade ↗</a>}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading"><div className="spinner" /> {mode==='clipboard'? 'Pricing item...' : 'Searching items...'}</div>
      )}
  {/* Removed large results table */}

  {!loading && searchPerformed && searchResults.length===0 && (
    <div style={{padding:12,opacity:.7}}>No listings matched your filters.</div>
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
