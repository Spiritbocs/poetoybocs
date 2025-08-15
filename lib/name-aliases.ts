// Alias / normalization mapping for item & currency names -> wiki titles / alternate lookup keys
// Extend this map over time. Keys are slugified (lowercase, hyphen).
export const ITEM_ALIASES: Record<string,string[]> = {
  'mavens-orb': ["Maven's_Orb","Orb_of_Dominance"],
  'orb-of-dominance': ['Orb_of_Dominance',"Maven's_Orb"],
  'headhunter': ['Headhunter'],
  'mageblood': ['Mageblood'],
  'divine-orb': ['Divine_Orb'],
  'chaos-orb': ['Chaos_Orb'],
}

export function slugifyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
}

export function candidateTitlesForSlug(slug: string, originalName?: string): string[] {
  const list = new Set<string>()
  if (originalName) list.add(originalName.replace(/ /g,'_'))
  if (ITEM_ALIASES[slug]) ITEM_ALIASES[slug].forEach(t=>list.add(t))
  const norm = slug.replace(/-/g,'_')
  list.add(norm)
  return Array.from(list)
}
