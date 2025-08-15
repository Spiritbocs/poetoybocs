"use client"
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { poeApi } from '@/lib/poe-api'
import { Sparkline } from '@/components/sparkline'
import { WikiContent } from '@/components/wiki-content'
import { candidateTitlesForSlug } from '@/lib/name-aliases'

interface Props { initialLine: any | null; slug: string; league: string; realm: string }

export default function CurrencyDetailClient({ initialLine, slug, league, realm }: Props) {
  const router = useRouter()
  const [line, setLine] = useState<any | null>(initialLine)
  const [divineChaos, setDivineChaos] = useState<number | null>(null)
  const [range, setRange] = useState<'week'|'month'|'3m'>('week')
  const [wikiTitle, setWikiTitle] = useState('')

  // Client refine if server miss / update
  useEffect(()=>{ if(line!==null) return; let cancelled=false; (async()=>{ try{ const cur=await poeApi.getCurrencyData(league,'Currency',realm); const fr=await poeApi.getCurrencyData(league,'Fragment',realm); const all=[...cur,...fr]; const found=all.find(l=> l.detailsId===slug || (l.currencyTypeName||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')===slug); if(!cancelled) setLine(found||undefined) }catch{ if(!cancelled) setLine(undefined as any) } })(); return ()=>{cancelled=true} },[line,league,realm,slug])
  // Divine chaos baseline
  useEffect(()=>{ let c=false; (async()=>{ try{ const cur=await poeApi.getCurrencyData(league,'Currency',realm); const divine=cur.find(l=>l.detailsId==='divine-orb'); if(!c&&divine?.chaosEquivalent) setDivineChaos(divine.chaosEquivalent) }catch{} })(); return ()=>{c=true} },[league,realm])
  // Wiki title
  useEffect(()=>{ if(!line) return; const base=line.currencyTypeName||''; const primary=base.replace(/ /g,'_'); const candidates=[primary,...candidateTitlesForSlug(slug, base)]; setWikiTitle(candidates[0]) },[line,slug])

  if (line === null) return <div style={{padding:32}}>Loading…</div>
  if (!line) return <div style={{padding:32}}>Currency not found.</div>

  const spark: number[] = line.paySparkLine?.data?.length ? line.paySparkLine.data : (line.receiveSparkLine?.data || [])
  const sparkTrim = spark.slice(-168)
  const first = sparkTrim[0]
  const last = sparkTrim[sparkTrim.length-1]
  const change7d = first? ((last-first)/first)*100 : 0
  const seg = Math.max(1, Math.round(sparkTrim.length/7))
  const prev = sparkTrim[sparkTrim.length - seg] ?? first
  const change24h = prev? ((last-prev)/prev)*100 : 0
  const chaosVal = line.chaosEquivalent || (line.pay?.value && line.pay?.value* (line.receive?.value? (line.pay?.value/line.receive?.value):1)) || null
  const divineVal = (divineChaos && chaosVal) ? chaosVal / divineChaos : null
  const listed = line.pay?.count || line.receive?.count || line.count || 0
  const tradeQuery = useMemo(()=>{ const name = (line.currencyTypeName||'').trim(); const query:any={ query:{ status:{ option:'online'}}, sort:{ price:'asc'} }; if (name) query.query.type={ option: name }; return query },[line])
  const tradeUrl = `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(tradeQuery))}`

  return (
    <div style={{padding:24, display:'flex', flexDirection:'column', gap:24}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>router.back()} style={{background:'none',border:'1px solid #333',color:'#ccc',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:12}}>← Back</button>
        <div style={{fontSize:12,opacity:.6}}>{league} • Currency • {realm.toUpperCase()}</div>
      </div>
      <div style={{display:'flex',gap:28,alignItems:'flex-start'}}>
        <div style={{flex:'1 1 820px',minWidth:700}}>
          <div style={{background:'#141414',padding:'20px 22px 18px',border:'1px solid #272727',borderRadius:8}}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16,flexWrap:'wrap'}}>
              {line.icon && <img src={line.icon} alt="" style={{width:60,height:60,objectFit:'contain'}} />}
              <div style={{display:'flex',flexDirection:'column'}}>
                <h1 style={{margin:0,fontSize:24}}>{line.currencyTypeName}</h1>
              </div>
              <div style={{marginLeft:'auto',display:'flex',gap:8}}>
                <button disabled={range==='week'} onClick={()=>setRange('week')} style={{background: range==='week'? '#2f4460':'#1e1e1e',border:'1px solid #2e3a44',color:'#cfe8ff',padding:'6px 16px',fontSize:12,borderRadius:4,cursor:'pointer'}}>WEEK</button>
                <button disabled style={{background:'#1e1e1e',border:'1px solid #2e2e2e',color:'#777',padding:'6px 16px',fontSize:12,borderRadius:4}}>MONTH</button>
                <button disabled style={{background:'#1e1e1e',border:'1px solid #2e2e2e',color:'#777',padding:'6px 16px',fontSize:12,borderRadius:4}}>3 MONTHS</button>
              </div>
            </div>
            <Sparkline data={sparkTrim} width={880} height={300} />
            <div style={{display:'flex',flexWrap:'wrap',gap:28,marginTop:24,fontSize:13}}>
              <div style={{minWidth:140}}><div style={{opacity:.55}}>Chaos Value</div><strong>{chaosVal? chaosVal.toFixed(2):'n/a'}</strong></div>
              {divineVal!==null && <div style={{minWidth:140}}><div style={{opacity:.55}}>Divine Value</div><strong>{divineVal.toFixed(divineVal<0.1?4:2)}</strong></div>}
              <div style={{minWidth:140}}><div style={{opacity:.55}}>24h Change</div><strong style={{color: change24h>0?'#57d977':change24h<0?'#ff6a6a':'#d5c186'}}>{(change24h>0?'+':'')+change24h.toFixed(1)}%</strong></div>
              <div style={{minWidth:140}}><div style={{opacity:.55}}>7d Change</div><strong style={{color: change7d>0?'#57d977':change7d<0?'#ff6a6a':'#d5c186'}}>{(change7d>0?'+':'')+change7d.toFixed(1)}%</strong></div>
              <div style={{minWidth:140}}><div style={{opacity:.55}}>Listings (est)</div><strong>{listed}</strong></div>
              <div style={{minWidth:160}}><div style={{opacity:.55}}>Trade</div><a href={tradeUrl} target="_blank" rel="noopener noreferrer" style={{color:'#67bfff',textDecoration:'none'}}>Open Search ↗</a></div>
              <div style={{minWidth:160}}><div style={{opacity:.55}}>Wiki</div><a href={`https://www.poewiki.net/wiki/${encodeURIComponent((line.currencyTypeName||'').replace(/ /g,'_'))}`} target="_blank" rel="noopener noreferrer" style={{color:'#d5c186',textDecoration:'none'}}>PoE Wiki ↗</a></div>
            </div>
            <div style={{marginTop:20,fontSize:11,opacity:.45}}>Longer timeframes coming soon (needs history endpoint).</div>
          </div>
        </div>
        <div style={{width:430,display:'flex',flexDirection:'column',gap:20}}>
          <div style={{background:'#161616',padding:'16px 18px',border:'1px solid #2a2a2a',borderRadius:8}}>
            <div style={{fontSize:13,opacity:.8,marginBottom:10}}>Wiki</div>
            {wikiTitle && <WikiContent title={wikiTitle} />}
          </div>
        </div>
      </div>
    </div>
  )
}
