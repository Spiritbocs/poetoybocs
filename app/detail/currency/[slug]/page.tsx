"use client"
import { Sparkline } from '@/components/sparkline'
import { poeApi } from '@/lib/poe-api'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'

export default function CurrencyDetailPage() {
  const searchParams = useSearchParams()
  const params = useParams() as { slug: string }
  const league = searchParams.get('league') || 'Mercenaries'
  const realm = searchParams.get('realm') || 'pc'
  const router = useRouter()
  const [currency, setCurrency] = useState<any | null>(null)
  useEffect(()=>{
    let cancelled = false
    ;(async()=>{
      try {
  const data = await poeApi.getCurrencyData(league, 'Currency', realm)
        const found = data.find(c=> c.detailsId === params.slug || c.currencyTypeName.toLowerCase().replace(/[^a-z0-9]+/g,'-')===params.slug)
        if (!cancelled) setCurrency(found || null)
      } catch { if (!cancelled) setCurrency(null) }
    })()
    return ()=>{ cancelled = true }
  }, [league, params.slug])
  if (currency === null) return <div style={{padding:32}}>Loading…</div>
  if (!currency) return <div style={{padding:32}}>Currency not found.</div>
  const pay = currency.paySparkLine?.data || []
  const recv = currency.receiveSparkLine?.data || []
  const merged = pay.length === recv.length ? pay.map((v:number,i:number)=> (v+recv[i])/2) : (recv.length? recv: pay)
  return (
    <div style={{padding:24, display:'flex', flexDirection:'column', gap:24}}>
      <div style={{fontSize:12}}><button onClick={()=>router.back()} style={{background:'none',border:'1px solid #333',color:'#ccc',padding:'4px 10px',borderRadius:6,cursor:'pointer'}}>← Back</button></div>
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        {currency.icon && <img src={currency.icon} alt="" style={{width:64,height:64}} />}
        <div style={{display:'flex',flexDirection:'column'}}>
          <h1 style={{margin:0,fontSize:26}}>{currency.currencyTypeName}</h1>
          <div style={{fontSize:12,opacity:.6}}>{league} Economy • Detail</div>
        </div>
      </div>
      <div style={{background:'#1e1e1e',padding:20,border:'1px solid #333',borderRadius:8}}>
        <h3 style={{margin:'0 0 12px'}}>Merged Pay/Receive (Last 7 Days)</h3>
        <div style={{width:'100%',maxWidth:760}}>
          <Sparkline data={merged.slice(-168)} width={760} height={180} />
        </div>
      </div>
      <div style={{fontSize:12,opacity:.7}}>Extended history endpoint TODO (requires separate poe.ninja history API). Current chart merges pay/receive.</div>
    </div>
  )
}
