"use client"
import { Sparkline } from '@/components/sparkline'
import { poeApi } from '@/lib/poe-api'
import { WikiContent } from '@/components/wiki-content'
import { useEffect, useState } from 'react'
import { useSearchParams, useParams, useRouter } from 'next/navigation'

export default function CurrencyDetailPage() {
  const searchParams = useSearchParams()
  const params = useParams() as { slug: string }
  const router = useRouter()
  const league = searchParams.get('league') || 'Mercenaries'
  const realm = searchParams.get('realm') || 'pc'
  const [line, setLine] = useState<any | null>(null)
  const [divineChaos, setDivineChaos] = useState<number | null>(null)
  const [range, setRange] = useState<'week'|'month'|'3m'>('week')

  useEffect(()=>{
    let cancelled=false
    ;(async()=>{
      try {
        const data = await poeApi.getCurrencyData(league,'Currency',realm)
        const found = data.find((l:any)=> l.detailsId===params.slug || (l.currencyTypeName||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')===params.slug)
        if (!cancelled) setLine(found || undefined)
      } catch { if(!cancelled) setLine(undefined as any)}
    })()
    return ()=>{ cancelled=true }
  },[league, params.slug, realm])

  useEffect(()=>{
    let cancelled=false
    ;(async()=>{
      try { const cur = await poeApi.getCurrencyData(league,'Currency',realm); const divine = cur.find(c=>c.detailsId==='divine-orb'); if (!cancelled && divine?.chaosEquivalent) setDivineChaos(divine.chaosEquivalent) } catch {}
    })(); return ()=>{ cancelled=true }
  }, [league, realm])

  if (line === null) return <div style={{padding:32}}>Loading…</div>
  if (!line) return <div style={{padding:32}}>Currency not found.</div>

  const spark: number[] = line.paySparkLine?.data?.length ? line.paySparkLine.data : (line.receiveSparkLine?.data || [])
  const first = spark[0]
  const last = spark[spark.length-1]
  const change7d = first? ((last-first)/first)*100 : 0
  const seg = Math.max(1, Math.round(spark.length/7))
  const prev = spark[spark.length - seg] ?? first
  const change24h = prev? ((last-prev)/prev)*100 : 0
  const chaosVal = line.chaosEquivalent || line.chaosValue
  const divineVal = (divineChaos && chaosVal) ? chaosVal / divineChaos : null
  const listed = line.pay?.length || line.receive?.length || line.count || 0
  const tradeQuery = (()=>{ const name = (line.currencyTypeName||'').trim(); const query:any={ query:{ status:{ option:'online'}}, sort:{ price:'asc'} }; if (name) query.query.type={ option: name }; return query })()
  const tradeUrl = `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(tradeQuery))}`

  return (
    <div style={{padding:24, display:'flex', flexDirection:'column', gap:28}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>router.back()} style={{background:'none',border:'1px solid #333',color:'#ccc',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:12}}>← Back to List</button>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        {line.icon && <img src={line.icon} alt="" style={{width:54,height:54,objectFit:'contain'}} />}
        <div style={{display:'flex',flexDirection:'column'}}>
          <h1 style={{margin:0,fontSize:22}}>{line.currencyTypeName}</h1>
          <div style={{fontSize:12,opacity:.6}}>{league} • Currency • {realm.toUpperCase()}</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button disabled className={range==='week'? 'active-range-btn':''} onClick={()=>setRange('week')} style={{background: range==='week'? '#2f4460':'#1e1e1e',border:'1px solid #2e3a44',color:'#cfe8ff',padding:'6px 16px',fontSize:12,borderRadius:4,cursor:'pointer'}}>WEEK</button>
          <button disabled className={range==='month'? 'active-range-btn':''} onClick={()=>setRange('month')} style={{background: range==='month'? '#2f4460':'#1e1e1e',border:'1px solid #2e2e2e',color:'#777',padding:'6px 16px',fontSize:12,borderRadius:4,cursor:'not-allowed'}}>MONTH</button>
          <button disabled className={range==='3m'? 'active-range-btn':''} onClick={()=>setRange('3m')} style={{background: range==='3m'? '#2f4460':'#1e1e1e',border:'1px solid #2e2e2e',color:'#777',padding:'6px 16px',fontSize:12,borderRadius:4,cursor:'not-allowed'}}>3 MONTHS</button>
        </div>
      </div>
      <div style={{background:'#141414',padding:'24px 24px 16px',border:'1px solid #272727',borderRadius:8,boxShadow:'0 2px 4px rgba(0,0,0,.4)'}}>
        <div style={{width:'100%',maxWidth:1100}}>
          <Sparkline data={spark.slice(-168)} width={1100} height={260} />
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:24,marginTop:24,fontSize:13}}>
          <div style={{minWidth:140}}><div style={{opacity:.55}}>Chaos Value</div><strong>{chaosVal? chaosVal.toFixed(2):'n/a'}</strong></div>
          {divineVal!==null && <div style={{minWidth:140}}><div style={{opacity:.55}}>Divine Value</div><strong>{divineVal.toFixed(divineVal<0.1?4:2)}</strong></div>}
          <div style={{minWidth:140}}><div style={{opacity:.55}}>24h Change</div><strong style={{color: change24h>0?'#57d977':change24h<0?'#ff6a6a':'#d5c186'}}>{(change24h>0?'+':'')+change24h.toFixed(1)}%</strong></div>
            <div style={{minWidth:140}}><div style={{opacity:.55}}>7d Change</div><strong style={{color: change7d>0?'#57d977':change7d<0?'#ff6a6a':'#d5c186'}}>{(change7d>0?'+':'')+change7d.toFixed(1)}%</strong></div>
          <div style={{minWidth:140}}><div style={{opacity:.55}}>Listings</div><strong>{listed}</strong></div>
          <div style={{minWidth:160}}><div style={{opacity:.55}}>Trade</div><a href={tradeUrl} target="_blank" rel="noopener noreferrer" style={{color:'#67bfff',textDecoration:'none'}}>Open Search ↗</a></div>
          <div style={{minWidth:160}}><div style={{opacity:.55}}>Wiki</div><a href={`https://www.poewiki.net/wiki/${encodeURIComponent((line.currencyTypeName||'').replace(/ /g,'_'))}`} target="_blank" rel="noopener noreferrer" style={{color:'#d5c186',textDecoration:'none'}}>Open PoE Wiki ↗</a></div>
        </div>
        <div style={{marginTop:20,fontSize:11,opacity:.45}}>Longer timeframes coming soon (needs history endpoint).</div>
      </div>
      <WikiContent title={line.currencyTypeName || ''} />
    </div>
  )
}
