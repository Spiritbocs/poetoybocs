"use client"
import { Sparkline } from '@/components/sparkline'
import { WikiContent } from '@/components/wiki-content'
import { poeApi } from '@/lib/poe-api'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { candidateTitlesForSlug } from '@/lib/name-aliases'

interface ListingLite { id:string; price?:{amount:number;currency:string}; seller:string; indexed:string; whisper:string; rarity?:string; icon?:string; name?:string; typeLine?:string; baseType?:string; implicitMods?:string[]; explicitMods?:string[] }

interface Props { initialItem:any|null; slug:string; league:string; type:string; realm:string }
export default function ItemDetailClient({ initialItem, slug, league, type, realm }: Props) {
  const router = useRouter()
  const [item, setItem] = useState<any | null>(initialItem)
  const [divineChaos, setDivineChaos] = useState<number | null>(null)
  const [range, setRange] = useState<'week'|'month'|'3m'>('week')
  const [listings, setListings] = useState<ListingLite[] | null>(null)
  const [listingsLoading, setListingsLoading] = useState(false)
  const [listingsAuto, setListingsAuto] = useState(false)
  const [wikiTitle, setWikiTitle] = useState<string>('')

  // Client-side refine if server miss
  useEffect(()=>{ if (item!==null) return; let cancelled=false; (async()=>{ try { const lines = await poeApi.getItemOverview(league,type,realm); const found = lines.find(l=> (l.detailsId||l.name||l.baseType||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')===slug); if(!cancelled) setItem(found||undefined) } catch { if(!cancelled) setItem(undefined as any) } })(); return ()=>{ cancelled=true } },[item, league,type,realm,slug])
  // Divine rate
  useEffect(()=>{ let c=false; (async()=>{ try { const cur= await poeApi.getCurrencyData(league,'Currency',realm); const divine=cur.find(cu=>cu.detailsId==='divine-orb'); if(!c&&divine?.chaosEquivalent) setDivineChaos(divine.chaosEquivalent) } catch{} })(); return ()=>{c=true} },[league,realm])
  // Listings on demand
  useEffect(()=>{ if(!listingsAuto||!item) return; let cancelled=false; const qName=item.name||item.baseType||item.currencyTypeName; if(!qName) return; setListingsLoading(true); (async()=>{ try { const query=poeApi.buildItemQuery(qName,{online:true}); const search=await poeApi.searchItems(league,query); if(!search?.id){ if(!cancelled) setListings([]); return } const details=await poeApi.getItemDetails(search.id,search.result); if(cancelled) return; const lite=details.map(d=>({ id:d.id, price:d.listing.price?{amount:d.listing.price.amount,currency:d.listing.price.currency}:undefined, seller:d.listing.account?.name, indexed:d.listing.indexed, whisper:d.listing.whisper, rarity:d.item.rarity, icon:d.item.icon, name:d.item.name, typeLine:d.item.typeLine, baseType:d.item.baseType, implicitMods:d.item.implicitMods, explicitMods:d.item.explicitMods })).slice(0,8); setListings(lite) } catch { if(!cancelled) setListings([]) } finally { if(!cancelled) setListingsLoading(false) } })(); return ()=>{cancelled=true} },[listingsAuto,item,league])
  // Wiki title selection
  useEffect(()=>{ if(!item) return; const base=item.name||item.baseType||item.currencyTypeName||''; const slugBase = base.replace(/ /g,'_'); const candidates=[slugBase,...candidateTitlesForSlug(slug,base)]; setWikiTitle(candidates[0]) },[item,slug])

  if (item === null) return <div style={{padding:32}}>Loading…</div>
  if (!item) return <div style={{padding:32}}>Item not found.</div>

  const spark: number[] = item.sparkline?.data || []
  const first = spark[0]; const last = spark[spark.length-1]; const change7d = first? ((last-first)/first)*100:0
  const seg = Math.max(1, Math.round(spark.length/7)); const prev = spark[spark.length-seg] ?? first; const change24h = prev? ((last-prev)/prev)*100:0
  const chaosVal = item.chaosValue || item.chaosEquivalent; const divineVal = (divineChaos && chaosVal)? chaosVal/divineChaos:null; const listed = item.listingCount || item.count || item.data_point_count || 0
  const rarityColor = (r?:string)=>{ if(!r) return '#c8c8c8'; const n=r.toLowerCase(); if(n==='unique') return '#af6025'; if(n==='rare') return '#ffff77'; if(n==='magic') return '#8888ff'; return '#c8c8c8'}
  const listingStats = useMemo(()=>{ if(!listings||!listings.length) return null; const priced=listings.filter(l=>l.price); if(!priced.length) return null; const vals=priced.map(l=>l.price!.amount); const sorted=[...vals].sort((a,b)=>a-b); const med=sorted[Math.floor(sorted.length/2)]; const avg=vals.reduce((a,b)=>a+b,0)/vals.length; return { low:sorted[0], median:med, average:avg, high:sorted[sorted.length-1], currency:priced[0].price!.currency } },[listings])
  const tradeQuery = (()=>{ const rawName=(item.name||'').trim(); const rawBase=(item.baseType||'').trim(); const ctn=(item.currencyTypeName||'').trim(); const query:any={ query:{ status:{ option:'online'}}, sort:{ price:'asc'} }; query.query.filters={ misc_filters:{ filters:{ ilvl:{ min:0,max:0 }}}}; if(rawName&&rawBase&&rawName!==rawBase){ query.query.name=rawName; query.query.type=rawBase } else { const chosen=rawBase||rawName||ctn; if(chosen) query.query.type={ option: chosen } } return query })(); const tradeUrl=`https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(tradeQuery))}`
  const formatAge=(iso:string)=>{ const d=new Date(iso); const diff=Date.now()-d.getTime(); const m=Math.floor(diff/60000); if(m<60) return m+'m'; const h=Math.floor(m/60); if(h<24) return h+'h'; return Math.floor(h/24)+'d' }

  return (
    <div style={{padding:24, display:'flex', flexDirection:'column', gap:24}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>router.back()} style={{background:'none',border:'1px solid #333',color:'#ccc',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:12}}>← Back</button>
        <div style={{fontSize:12,opacity:.6}}>{league} • {type} • {realm.toUpperCase()}</div>
      </div>
      <div style={{display:'flex',gap:28,alignItems:'flex-start'}}>
        <div style={{flex:'1 1 820px',minWidth:700}}>
          <div style={{background:'#141414',padding:'20px 22px 18px',border:'1px solid #272727',borderRadius:8}}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16,flexWrap:'wrap'}}>
              {item.icon && <img src={item.icon} alt="" style={{width:60,height:60,objectFit:'contain'}} />}
              <div style={{display:'flex',flexDirection:'column'}}>
                <h1 style={{margin:0,fontSize:24,color:rarityColor(item.rarity)}}>{item.name || item.baseType || item.currencyTypeName}</h1>
                {(item.baseType && item.name && item.name!==item.baseType) && <div style={{fontSize:12,opacity:.7}}>{item.baseType}</div>}
              </div>
              <div style={{marginLeft:'auto',display:'flex',gap:8}}>
                <button disabled={range==='week'} onClick={()=>setRange('week')} style={{background: range==='week'? '#2f4460':'#1e1e1e',border:'1px solid #2e3a44',color:'#cfe8ff',padding:'6px 16px',fontSize:12,borderRadius:4,cursor:'pointer'}}>WEEK</button>
                <button disabled style={{background:'#1e1e1e',border:'1px solid #2e2e2e',color:'#777',padding:'6px 16px',fontSize:12,borderRadius:4}}>MONTH</button>
                <button disabled style={{background:'#1e1e1e',border:'1px solid #2e2e2e',color:'#777',padding:'6px 16px',fontSize:12,borderRadius:4}}>3 MONTHS</button>
              </div>
            </div>
            <Sparkline data={spark.slice(-168)} width={880} height={300} />
            <div style={{display:'flex',flexWrap:'wrap',gap:28,marginTop:24,fontSize:13}}>
              <div style={{minWidth:140}}><div style={{opacity:.55}}>Chaos Value</div><strong>{chaosVal? chaosVal.toFixed(2):'n/a'}</strong></div>
              {divineVal!==null && <div style={{minWidth:140}}><div style={{opacity:.55}}>Divine Value</div><strong>{divineVal.toFixed(divineVal<0.1?4:2)}</strong></div>}
              <div style={{minWidth:140}}><div style={{opacity:.55}}>24h Change</div><strong style={{color: change24h>0?'#57d977':change24h<0?'#ff6a6a':'#d5c186'}}>{(change24h>0?'+':'')+change24h.toFixed(1)}%</strong></div>
              <div style={{minWidth:140}}><div style={{opacity:.55}}>7d Change</div><strong style={{color: change7d>0?'#57d977':change7d<0?'#ff6a6a':'#d5c186'}}>{(change7d>0?'+':'')+change7d.toFixed(1)}%</strong></div>
              <div style={{minWidth:140}}><div style={{opacity:.55}}>Listings (est)</div><strong>{listed}</strong></div>
              {listingStats && <div style={{display:'flex',flexDirection:'column',gap:6}}><div style={{opacity:.55}}>Sample Prices</div><div style={{display:'flex',gap:14,fontSize:12}}><span>Low <strong>{listingStats.low.toFixed(1)} {listingStats.currency}</strong></span><span>Med <strong>{listingStats.median.toFixed(1)}</strong></span><span>Avg <strong>{listingStats.average.toFixed(1)}</strong></span><span>High <strong>{listingStats.high.toFixed(1)}</strong></span></div></div>}
              <div style={{minWidth:160}}><div style={{opacity:.55}}>Trade</div><a href={tradeUrl} target="_blank" rel="noopener noreferrer" style={{color:'#67bfff',textDecoration:'none'}}>Open Search ↗</a></div>
              <div style={{minWidth:160}}><div style={{opacity:.55}}>Wiki</div><a href={`https://www.poewiki.net/wiki/${encodeURIComponent((item.name||item.baseType||'').replace(/ /g,'_'))}`} target="_blank" rel="noopener noreferrer" style={{color:'#d5c186',textDecoration:'none'}}>PoE Wiki ↗</a></div>
            </div>
            <div style={{marginTop:20,fontSize:11,opacity:.45}}>Longer timeframes coming soon (needs history endpoint).</div>
          </div>
        </div>
  <div style={{width:480,display:'flex',flexDirection:'column',gap:20}}>
          <div style={{background:'#161616',padding:'18px 20px 14px',border:'1px solid #2a2a2a',borderRadius:8}}>
            <div style={{fontSize:13,letterSpacing:.5,opacity:.8,marginBottom:10}}>Item Information</div>
            {item.icon && <img src={item.icon} alt="" style={{width:54,height:54,objectFit:'contain',marginBottom:8}} />}
            <div style={{fontSize:14,fontWeight:600,color:rarityColor(item.rarity)}}>{item.name || item.baseType}</div>
            <div style={{fontSize:11,opacity:.6,marginBottom:10}}>{item.baseType || item.name}</div>
            {item.implicitModifiers?.length>0 && <div style={{marginBottom:12}}><div style={{fontSize:11,opacity:.55,marginBottom:4}}>Implicit</div>{item.implicitModifiers.map((m:string,i:number)=>(<div key={i} style={{fontSize:11,color:'#8888ff'}}>{m}</div>))}</div>}
            {item.explicitModifiers?.length>0 && <div style={{marginBottom:12}}><div style={{fontSize:11,opacity:.55,marginBottom:4}}>Explicit</div>{item.explicitModifiers.map((m:string,i:number)=>(<div key={i} style={{fontSize:11,color:'#ffff77'}}>{m}</div>))}</div>}
            <div style={{fontSize:10,opacity:.4}}>Overview (poe.ninja) + optional live listings below.</div>
          </div>
          <div style={{background:'#161616',padding:'18px 20px 16px',border:'1px solid #2a2a2a',borderRadius:8,display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',alignItems:'center'}}>
              <div style={{fontSize:13,letterSpacing:.5,opacity:.8}}>Live Listings</div>
              {!listingsAuto && <button onClick={()=>setListingsAuto(true)} style={{marginLeft:'auto',background:'#222',border:'1px solid #444',color:'#ccc',fontSize:11,padding:'4px 10px',borderRadius:4,cursor:'pointer'}}>Load</button>}
              {listingsAuto && <div style={{marginLeft:'auto',fontSize:11,opacity:.45}}>{listingsLoading? 'Loading…': (listings? listings.length:0)} shown</div>}
            </div>
            {!listingsAuto && <div style={{fontSize:12,opacity:.55}}>Click Load to fetch sample listings (real trade API).</div>}
            {listingsAuto && listingsLoading && <div style={{fontSize:12,opacity:.6}}>Searching trade API…</div>}
            {listingsAuto && !listingsLoading && (!listings || listings.length===0) && <div style={{fontSize:12,opacity:.55}}>No listings.</div>}
            {listingsAuto && listings && listings.length>0 && <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:320,overflow:'auto',paddingRight:4}}>{listings.map(l=>{ const price=l.price?`${l.price.amount} ${l.price.currency}`:'n/a'; return (<div key={l.id} style={{display:'flex',flexDirection:'column',gap:4,padding:'8px 10px',background:'#1d1d1d',border:'1px solid #272727',borderRadius:6}}><div style={{display:'flex',gap:8,alignItems:'center'}}>{l.icon && <img src={l.icon} alt="" style={{width:30,height:30,objectFit:'contain'}} />}<div style={{flex:1}}><div style={{fontSize:12,color:rarityColor(l.rarity)}}>{l.name || l.typeLine || l.baseType}</div><div style={{fontSize:10,opacity:.55}}>{price} • {formatAge(l.indexed)} • {l.seller}</div></div><button onClick={()=>navigator.clipboard.writeText(l.whisper)} style={{background:'none',border:'1px solid #333',color:'#bbb',fontSize:10,padding:'4px 6px',borderRadius:4,cursor:'pointer'}}>Copy</button></div>{(l.implicitMods||l.explicitMods)&&<div style={{display:'flex',flexDirection:'column',gap:2}}>{l.implicitMods&&l.implicitMods.slice(0,2).map((m,i)=>(<div key={'im'+i} style={{fontSize:10,color:'#8888ff'}}>{m}</div>))}{l.explicitMods&&l.explicitMods.slice(0,3).map((m,i)=>(<div key={'em'+i} style={{fontSize:10,color:'#ffff77'}}>{m}</div>))}</div>}</div>) })}</div>}
            <div style={{fontSize:10,opacity:.4}}>Snapshot; refine with full search.</div>
          </div>
          <div style={{background:'#161616',padding:'16px 18px',border:'1px solid #2a2a2a',borderRadius:8}}>
            <div style={{fontSize:13,opacity:.8,marginBottom:10}}>Wiki</div>
            {wikiTitle && <WikiContent title={wikiTitle} />}
          </div>
        </div>
      </div>
    </div>
  )
}
