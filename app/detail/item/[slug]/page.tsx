// Converted to hybrid: server loader (RSC) + client detail component.
import { candidateTitlesForSlug, slugifyName } from '@/lib/name-aliases'
import { poeApi } from '@/lib/poe-api'
import ItemDetailClient from './client.js'

export const dynamic = 'force-dynamic'

interface Props { params: { slug: string }; searchParams: { league?: string; type?: string; realm?: string } }

export default async function ItemDetailPageWrapper({ params, searchParams }: Props) {
  const league = searchParams.league || 'Mercenaries'
  const type = searchParams.type || 'UniqueWeapon'
  const realm = searchParams.realm || 'pc'
  // Fetch overview on server to speed TTFB
  let lines: any[] = []
  try { lines = await poeApi.getItemOverview(league, type, realm) } catch {}
  // Matching logic with alias fallback
  const slug = params.slug
  const candidate = lines.find(l => {
    const name = l.detailsId || l.name || l.baseType || l.currencyTypeName || ''
    const s = slugifyName(name)
    return s === slug
  }) || (() => {
    const titles = candidateTitlesForSlug(slug)
    return lines.find(l => titles.some(t=> slugifyName((l.name||l.baseType||l.currencyTypeName||'').replace(/ /g,'_'))=== slugifyName(t)))
  })()

  return <ItemDetailClient initialItem={candidate || null} slug={slug} league={league} type={type} realm={realm} />
}
