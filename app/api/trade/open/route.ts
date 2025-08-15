export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// GET /api/trade/open?league=Mercenaries&name=Item+Name&base=Base+Type&ctn=CurrencyTypeName
// Builds a PoE trade search via upstream POST then 302 redirects user to official trade page.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const league = url.searchParams.get('league') || 'Standard'
  const name = url.searchParams.get('name')?.trim() || ''
  const base = url.searchParams.get('base')?.trim() || ''
  const ctn = url.searchParams.get('ctn')?.trim() || ''

  // Construct query body mirroring buildItemTradeQuery logic
  const query: any = { query: { status: { option: 'online' } }, sort: { price: 'asc' } }
  if (name && base && name !== base) { query.query.name = name; query.query.type = base }
  else if (name) { query.query.name = name }
  else if (base) { query.query.type = base }
  else if (ctn) { query.query.name = ctn }
  else return NextResponse.json({ error: 'missing_identifiers' }, { status: 400 })

  try {
    const upstream = `https://www.pathofexile.com/api/trade/search/${encodeURIComponent(league)}`
    const res = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'spiritbocs-tracker/1.0 (+trade-open)' },
      body: JSON.stringify(query),
      cache: 'no-store'
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error', status: res.status }, { status: 502 })
    }
    const json = await res.json()
    if (!json?.id) return NextResponse.json({ error: 'no_id' }, { status: 500 })
    const dest = `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}/${json.id}`
    return NextResponse.redirect(dest)
  } catch (e:any) {
    return NextResponse.json({ error: 'exception', message: e?.message }, { status: 500 })
  }
}
