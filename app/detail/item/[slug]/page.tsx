"use client"
import { Sparkline } from '@/components/sparkline'
import { poeApi } from '@/lib/poe-api'
import { useEffect, useState } from 'react'
import { useSearchParams, useParams, useRouter } from 'next/navigation'

export default function ItemDetailPage() {
  const searchParams = useSearchParams()
  const params = useParams() as { slug: string }
  const router = useRouter()
  const league = searchParams.get('league') || 'Mercenaries'
  const type = searchParams.get('type') || 'UniqueWeapon'
  const [item, setItem] = useState<any | null>(null)
  useEffect(()=>{
    let cancelled = false
    ;(async()=>{
      try {
        const lines = await poeApi.getItemOverview(league, type, 'pc')
        const found = lines.find((l:any)=> (
          (l.detailsId && l.detailsId===params.slug) ||
          ((l.name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')===params.slug) ||
          ((l.baseType||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')===params.slug) ||
          ((l.currencyTypeName||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')===params.slug)
        ))
        if (!cancelled) setItem(found || undefined)
      } catch { if (!cancelled) setItem(undefined as any) }
    })()
    return ()=>{ cancelled = true }
  }, [league, type, params.slug])
  if (item === null) return <div style={{padding:32}}>Loading…</div>
  if (!item) return <div style={{padding:32}}>Item not found.</div>
  const spark = item.sparkline?.data || []
  return (
    <div style={{padding:24, display:'flex', flexDirection:'column', gap:24}}>
      <div style={{fontSize:12}}><button onClick={()=>router.back()} style={{background:'none',border:'1px solid #333',color:'#ccc',padding:'4px 10px',borderRadius:6,cursor:'pointer'}}>← Back</button></div>
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        {item.icon && <img src={item.icon} alt="" style={{width:64,height:64,objectFit:'contain'}} />}
        <div style={{display:'flex',flexDirection:'column'}}>
          <h1 style={{margin:0,fontSize:26}}>{item.name || item.baseType || item.currencyTypeName}</h1>
          <div style={{fontSize:12,opacity:.6}}>{league} Economy • {type}</div>
        </div>
      </div>
      <div style={{background:'#1e1e1e',padding:20,border:'1px solid #333',borderRadius:8}}>
        <h3 style={{margin:'0 0 12px'}}>Last 7 Days</h3>
        <div style={{width:'100%',maxWidth:760}}>
          <Sparkline data={spark.slice(-168)} width={760} height={180} />
        </div>
      </div>
      <div style={{fontSize:12,opacity:.7}}>Future: extended history & multi-metric overlays.</div>
    </div>
  )
}
