import { Sparkline } from '@/components/sparkline'
import { poeApi } from '@/lib/poe-api'

interface Props { params: { slug: string }; searchParams: { league?: string } }

// Simple mapping fallback (detailsId already slug-like)
async function fetchCurrency(league: string, slug: string) {
  const data = await poeApi.getCurrencyData(league, 'Currency', 'pc')
  return data.find(c=> c.detailsId === slug || c.currencyTypeName.toLowerCase().replace(/[^a-z0-9]+/g,'-')===slug)
}

export default async function CurrencyDetailPage({ params, searchParams }: Props) {
  const league = searchParams.league || 'Mercenaries'
  let currency: any = null
  try { currency = await fetchCurrency(league, params.slug) } catch {}
  if (!currency) return <div style={{padding:32}}>Currency not found.</div>
  const spark = currency.receiveSparkLine?.data || currency.paySparkLine?.data || []
  return (
    <div style={{padding:24, display:'flex', flexDirection:'column', gap:24}}>
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        {currency.icon && <img src={currency.icon} alt="" style={{width:64,height:64}} />}
        <div style={{display:'flex',flexDirection:'column'}}>
          <h1 style={{margin:0,fontSize:26}}>{currency.currencyTypeName}</h1>
          <div style={{fontSize:12,opacity:.6}}>{league} Economy</div>
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
