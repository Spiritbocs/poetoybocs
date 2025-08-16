"use client"
import React, { useEffect, useState } from 'react'
import { poeApi } from '@/lib/poe-api'

interface CharacterItem {
  id: string
  name: string
  typeLine: string
  icon: string
  inventoryId: string
  frameType: number
  w: number
  h: number
  sockets?: { group: number; colour: string }[]
  socketedItems?: { id: string; name: string; typeLine: string; icon: string; support?: boolean }[]
  implicitMods?: string[]
  explicitMods?: string[]
  craftedMods?: string[]
  enchantMods?: string[]
  fracturedMods?: string[]
  ilvl?: number
  corrupted?: boolean
  note?: string
}

// Mapping of PoE inventory slots to grid coordinates (cols: 12x? flexible) similar to in-game layout
const slotPositions: Record<string, { x: number; y: number; w: number; h: number }> = {
  Weapon: { x: 0, y: 1, w: 2, h: 4 },
  Offhand: { x: 10, y: 1, w: 2, h: 4 },
  Helm: { x: 4, y: 0, w: 2, h: 2 },
  BodyArmour: { x: 4, y: 2, w: 2, h: 3 },
  Gloves: { x: 2, y: 3, w: 2, h: 2 },
  Boots: { x: 6, y: 3, w: 2, h: 2 },
  Belt: { x: 4, y: 5, w: 2, h: 1 },
  Amulet: { x: 3, y: 1, w: 1, h: 1 },
  Ring: { x: 3, y: 2, w: 1, h: 1 }, // first ring
  Ring2: { x: 7, y: 2, w: 1, h: 1 },
  Trinket: { x: 7, y: 1, w: 1, h: 1 },
  Flask: { x: 0, y: 6, w: 12, h: 1 },
  // Additional placeholders
}

function frameBorderColor(frameType: number) {
  switch (frameType) {
    case 3: return '#af6025' // unique
    case 2: return '#8888ff' // rare? (PoE codes differ; adjust)
    case 1: return '#4e9a06'
    case 0: return '#777'
    default: return '#555'
  }
}

export const CharacterInventory: React.FC<{ characterName?: string }> = ({ characterName }) => {
  const [items, setItems] = useState<CharacterItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selected = characterName || poeApi.getSelectedCharacter()?.name

  useEffect(() => {
    const run = async () => {
      if (!selected || !poeApi.isAuthenticated()) return
      setLoading(true); setError(null)
      try {
        const token = (poeApi as any).authToken?.access_token
        const res = await fetch(`/api/poe/character-items?character=${encodeURIComponent(selected)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        if (!res.ok) {
          const j = await res.json().catch(()=>({}))
            setError(j.error || `HTTP ${res.status}`)
        } else {
          const j = await res.json()
          setItems(j.items || [])
        }
      } catch (e: any) {
        setError(e?.message || 'fetch_failed')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [selected])

  if (!poeApi.isAuthenticated()) {
    return <div className="text-xs opacity-70">Login to view character items.</div>
  }
  if (!selected) return <div className="text-xs opacity-70">No character selected.</div>
  if (loading) return <div className="text-xs">Loading items...</div>
  if (error) return <div className="text-xs text-red-400">Error: {error}</div>

  // Group items by slot
  const bySlot: Record<string, CharacterItem[]> = {}
  items.forEach(i => {
    if (!bySlot[i.inventoryId]) bySlot[i.inventoryId] = []
    bySlot[i.inventoryId].push(i)
  })

  return (
    <div className="relative" style={{ width: 560, padding: 12 }}>
      <div className="grid" style={{ position: 'relative', width: '100%', aspectRatio: '12 / 7', background: 'rgba(255,255,255,0.03)', border: '1px solid #333', borderRadius: 8 }}>
        {Object.entries(bySlot).map(([slot, slotItems]) => {
          const pos = slotPositions[slot] || null
          return slotItems.map((it, idx) => {
            const x = pos ? pos.x : 0
            const y = pos ? pos.y : 0
            const w = pos ? pos.w : 1
            const h = pos ? pos.h : 1
            const left = (x / 12) * 100
            const top = (y / 7) * 100
            const width = (w / 12) * 100
            const height = (h / 7) * 100
            return (
              <div key={it.id + idx} className="group" style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, padding: 2 }}>
                <div style={{ width: '100%', height: '100%', border: `2px solid ${frameBorderColor(it.frameType)}`, borderRadius: 4, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <img src={it.icon} alt={it.name || it.typeLine} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.7))' }} />
                  {it.socketedItems && it.socketedItems.length > 0 && (
                    <div style={{ position: 'absolute', bottom: 2, right: 2, display: 'flex', gap: 2 }}>
                      {it.socketedItems.slice(0,4).map(g => <span key={g.id} style={{ width: 8, height: 8, background: g.support ? '#4faaff' : '#7adb4f', borderRadius: '50%' }} />)}
                    </div>
                  )}
                  <div className="tooltip" style={{ position: 'absolute', inset: 0, opacity: 0, transition: 'opacity .15s', pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', left: '100%', top: 0, marginLeft: 8, background: '#0d0d0f', padding: '6px 8px', border: '1px solid #333', borderRadius: 6, width: 240, zIndex: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{it.name || it.typeLine}</div>
                      {(it.explicitMods || it.implicitMods) && (
                        <ul style={{ marginTop: 4, fontSize: 11, lineHeight: 1.3 }}>
                          {it.implicitMods?.map(m => <li key={m} style={{ color: '#b7b7ff' }}>{m}</li>)}
                          {it.explicitMods?.map(m => <li key={m}>{m}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        })}
      </div>
      <style jsx>{`
        .group:hover .tooltip { opacity: 1; }
      `}</style>
    </div>
  )
}

export default CharacterInventory
