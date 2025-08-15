// Server wrapper for currency detail: fetch overview (currency + fragments) and pass to client component.
import { poeApi } from '@/lib/poe-api'
import { slugifyName, candidateTitlesForSlug } from '@/lib/name-aliases'
// @ts-ignore Next.js resolves .tsx in same folder
import CurrencyDetailClient from './client'

export const dynamic = 'force-dynamic'

interface Props { params: { slug: string }; searchParams: { league?: string; realm?: string } }

export default async function CurrencyDetailPageWrapper({ params, searchParams }: Props) {
  const league = searchParams.league || 'Mercenaries'
  const realm = searchParams.realm || 'pc'
  const slug = params.slug

  let currencyLines: any[] = []
  let fragmentLines: any[] = []
  try { currencyLines = await poeApi.getCurrencyData(league,'Currency',realm) } catch (e) { console.warn('Currency fetch failed', (e as any)?.message) }
  try { fragmentLines = await poeApi.getCurrencyData(league,'Fragment',realm) } catch (e) { console.warn('Fragment fetch failed', (e as any)?.message) }
  const all = [...currencyLines, ...fragmentLines]

  const primary = all.find(l => l?.detailsId === slug || slugifyName(l?.currencyTypeName||'') === slug) || (()=>{
    const cands = candidateTitlesForSlug(slug)
    return all.find(l => cands.some(t => slugifyName((l?.currencyTypeName||'').replace(/ /g,'-')) === slugifyName(t.replace(/_/g,'-'))))
  })()

  if (!primary) {
    console.warn('Currency slug unresolved', { slug, league, realm, searched: all.length, candidates: candidateTitlesForSlug(slug) })
  }

  return <CurrencyDetailClient initialLine={primary || null} slug={slug} league={league} realm={realm} />
}
