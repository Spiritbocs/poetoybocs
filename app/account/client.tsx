"use client"
import React, { useEffect, useState } from 'react'
import { poeApi, CharacterSummary } from '@/lib/poe-api'
import CharacterInventory from '@/components/character-inventory'

export default function AccountClient() {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [charLoading, setCharLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const tokenLoaded = poeApi.loadStoredToken()
      setAuthed(tokenLoaded)
      if (!tokenLoaded) { setLoading(false); return }
      const prof = await poeApi.getProfile(false)
      if (prof?.name) setProfileName(prof.name)
      setCharLoading(true)
      try {
        const chars = await poeApi.getCharacters(false)
        if (chars) {
          setCharacters(chars)
          const sel = poeApi.getSelectedCharacter()?.name || chars[0]?.name || null
          setSelected(sel)
        }
      } catch (e: any) {
        setError(e?.message || 'characters_failed')
      } finally { setCharLoading(false); setLoading(false) }
    }
    init()
  }, [])

  const selectCharacter = (name: string) => {
    poeApi.setSelectedCharacter(name)
    setSelected(name)
  }

  if (loading) return <div className="p-6 text-sm opacity-80">Loading account...</div>
  if (!authed) return <div className="p-6 text-sm">You need to authenticate first.</div>

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-xl font-semibold">Account: {profileName}</h1>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64">
          <h2 className="text-sm font-semibold mb-2">Characters</h2>
          {charLoading && <div className="text-xs mb-2">Loading list...</div>}
          <ul className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {characters.map(c => (
              <li key={c.name}>
                <button
                  onClick={() => selectCharacter(c.name)}
                  className={`w-full text-left px-3 py-2 rounded border text-xs transition ${selected===c.name ? 'bg-blue-600/40 border-blue-500' : 'border-gray-600 hover:bg-gray-700/40'}`}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="opacity-80">Lv {c.level} {c.class}{c.league && <span className="ml-1">({c.league})</span>}</div>
                </button>
              </li>
            ))}
            {!characters.length && !charLoading && <li className="text-xs opacity-70">No characters.</li>}
          </ul>
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold mb-2">Equipment</h2>
          <CharacterInventory characterName={selected || undefined} />
        </div>
      </div>
    </div>
  )
}
