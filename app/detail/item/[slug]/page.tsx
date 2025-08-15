import { Sparkline } from '@/components/sparkline'
import { poeApi } from '@/lib/poe-api'

interface Props { params: { slug: string }; searchParams: { league?: string; type?: string } }

async function findAny(league: string, type: string | undefined, slug: string) {
  const t = type || 'UniqueWeapon'
  const lines = await poeApi.getItemOverview(league, t, 'pc')
  return lines.find((l:any)=> (
    (l.detailsId && l.detailsId===slug) ||
    ((l.name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')===slug) ||
    ((l.baseType||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')===slug) ||
    ((l.currencyTypeName||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')===slug)
  ))
}

export default async function ItemDetailPage({ params, searchParams }: Props) {
  const league = searchParams.league || 'Mercenaries'
  const type = searchParams.type
  let item: any = null
  try { item = await findAny(league, type, params.slug) } catch {}
  if (!item) return <div style={{padding:32}}>Item not found.</div>
  const spark = item.sparkline?.data || []
  return (
    <div style={{padding:24, display:'flex', flexDirection:'column', gap:24}}>
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        {item.icon && <img src={item.icon} alt="" style={{width:64,height:64,objectFit:'contain'}} />}
        <div style={{display:'flex',flexDirection:'column'}}>
          <h1 style={{margin:0,fontSize:26}}>{item.name || item.baseType || item.currencyTypeName}</h1>
          <div style={{fontSize:12,opacity:.6}}>{league} Economy{type? ` • ${type}`:''}</div>
        </div>
      </div>
      <div style={{background:'#1e1e1e',padding:20,border:'1px solid #333',borderRadius:8}}>
        <h3 style={{margin:'0 0 12px'}}>Last 7 Days (Detail)</h3>
        <div style={{width:'100%',maxWidth:640}}>
          <Sparkline data={spark.slice(-168)} width={640} height={160} />
        </div>
      </div>
      <div style={{fontSize:12,opacity:.7}}>More detailed analytics coming soon…</div>
    </div>
  )
}
