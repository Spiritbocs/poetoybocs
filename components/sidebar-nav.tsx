"use client"
import { useState, useEffect } from 'react'
import { poeApi } from '@/lib/poe-api'

interface NavGroup { heading: string; items: { key: string; label: string; icon?: string; type?: "Currency" | "Fragment" }[] }
export interface SidebarNavProps { onSelect: (section: { key: string; label: string; type?: "Currency" | "Fragment" }) => void; activeKey: string; league: string; realm?: string }

// Cache to avoid refetching icons repeatedly per league
const iconsCache: Record<string, Record<string,string>> = {}
// Explicit overrides when we want a specific representative icon
const ICON_OVERRIDES: Record<string,string> = {}

const GROUPS: NavGroup[] = [
  { heading: 'GENERAL', items: [
    { key: 'currency', label: 'Currency', type: 'Currency' },
    { key: 'fragments', label: 'Fragments', type: 'Fragment' },
    { key: 'runegrafts', label: 'Runegrafts' },
    { key: 'allflame-embers', label: 'Allflame Embers' },
    { key: 'tattoos', label: 'Tattoos' },
    { key: 'omens', label: 'Omens' },
    { key: 'divination-cards', label: 'Divination Cards' },
    { key: 'artifacts', label: 'Artifacts' },
    { key: 'oils', label: 'Oils' },
    { key: 'incubators', label: 'Incubators' },
    { key: 'scarabs', label: 'Scarabs' },
    { key: 'fossils', label: 'Fossils' },
    { key: 'resonators', label: 'Resonators' },
    { key: 'beasts', label: 'Beasts' },
    { key: 'essences', label: 'Essences' },
  ]},
  { heading: 'EQUIPMENT & GEMS', items: [
    { key: 'unique-weapons', label: 'Unique Weapons' },
    { key: 'unique-armours', label: 'Unique Armours' },
    { key: 'unique-accessories', label: 'Unique Accessories' },
    { key: 'unique-flasks', label: 'Unique Flasks' },
    { key: 'unique-jewels', label: 'Unique Jewels' },
    { key: 'unique-tinctures', label: 'Unique Tinctures' },
    { key: 'unique-relics', label: 'Unique Relics' },
    { key: 'skill-gems', label: 'Skill Gems' },
    { key: 'cluster-jewels', label: 'Cluster Jewels' },
  ]},
  { heading: 'ATLAS', items: [
    { key: 'maps', label: 'Maps' },
    { key: 'blighted-maps', label: 'Blighted Maps' },
    { key: 'blighted-ravaged-maps', label: 'Blight-ravaged Maps' },
    { key: 'unique-maps', label: 'Unique Maps' },
    { key: 'delirium-orbs', label: 'Delirium Orbs' },
    { key: 'invitations', label: 'Invitations' },
    { key: 'memories', label: 'Memories' },
  ]},
  { heading: 'CRAFTING', items: [
    { key: 'base-types', label: 'Base Types' },
    { key: 'vials', label: 'Vials' },
    { key: 'fossils', label: 'Fossils' },
    { key: 'resonators', label: 'Resonators' },
    { key: 'beasts', label: 'Beasts' },
    { key: 'essences', label: 'Essences' },
  ]}
]

function mapKeyToType(key: string): string | null {
  const map: Record<string,string> = {
    runegrafts: 'Runegraft',
    'allflame-embers': 'AllflameEmber',
    tattoos: 'Tattoo',
    omens: 'Omen',
    'divination-cards': 'DivinationCard',
    artifacts: 'Artifact',
    oils: 'Oil',
    incubators: 'Incubator',
    scarabs: 'Scarab',
    fossils: 'Fossil',
    resonators: 'Resonator',
    beasts: 'Beast',
    essences: 'Essence',
    'unique-weapons': 'UniqueWeapon',
    'unique-armours': 'UniqueArmour',
    'unique-accessories': 'UniqueAccessory',
    'unique-flasks': 'UniqueFlask',
    'unique-jewels': 'UniqueJewel',
  'unique-tinctures': 'UniqueTincture',
  'unique-relics': 'UniqueRelic',
    'skill-gems': 'SkillGem',
    'cluster-jewels': 'ClusterJewel',
    maps: 'Map',
    'blighted-maps': 'BlightedMap',
    'blighted-ravaged-maps': 'BlightRavagedMap',
    'unique-maps': 'UniqueMap',
    'delirium-orbs': 'DeliriumOrb',
    invitations: 'Invitation',
    memories: 'Memory',
    'base-types': 'BaseType',
    vials: 'Vial'
  }
  return map[key] || null
}

export function SidebarNav({ activeKey, onSelect, league, realm='pc' }: SidebarNavProps) {
  const cacheKey = `${realm}:${league}`
  const [icons, setIcons] = useState<Record<string,string>>(() => ({ ...(iconsCache[cacheKey] || {}), ...ICON_OVERRIDES }))

  useEffect(() => {
    let cancelled = false
    async function load() {
  if (iconsCache[cacheKey]) { setIcons({ ...iconsCache[cacheKey], ...ICON_OVERRIDES }); return }
      const result: Record<string,string> = {}
      try {
  const currency = await poeApi.getCurrencyData(league, 'Currency', realm)
        const divine = currency.find(c=>c.detailsId==='divine-orb') || currency[0]
        if (divine?.icon) result['currency'] = divine.icon
  const fragments = await poeApi.getCurrencyData(league, 'Fragment', realm)
        if (fragments[0]?.icon) result['fragments'] = fragments[0].icon
      } catch {}
      const keys = GROUPS.flatMap(g=>g.items.map(i=>i.key)).filter(k=>!['currency','fragments'].includes(k))
      for (const key of keys) {
        const type = mapKeyToType(key)
        if (!type) continue
        try {
          const items = await poeApi.getItemOverview(league, type, realm)
          const withIcon = items.find((i:any)=>i.icon)
          if (withIcon?.icon) result[key] = withIcon.icon
        } catch {}
      }
  // Apply overrides last
  Object.assign(result, ICON_OVERRIDES)
  iconsCache[cacheKey] = result
  if (!cancelled) setIcons(result)
    }
    load()
    return () => { cancelled = true }
  }, [league, realm])

  const IconImg = ({ src, alt }: { src?: string; alt: string }) => (
    <span style={{display:'inline-block',width:32,height:32,marginRight:10,verticalAlign:'middle'}}>
      {src && <img src={src} alt={alt} style={{width:32,height:32,display:'block'}} />}
    </span>
  )
  return (
    <aside className="sidebar-nav">
      {GROUPS.map(g => (
        <div key={g.heading} className="nav-group">
          <div className="nav-heading">{g.heading}</div>
          <ul className="nav-items">
            {g.items.map(item => (
              <li key={item.key}>
                <button className={`nav-link ${activeKey === item.key ? 'active' : ''}`} onClick={() => onSelect(item)}>
                  <IconImg src={icons[item.key]} alt={item.label} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  )
}
