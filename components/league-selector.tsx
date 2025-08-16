"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { poeApi, type League } from "@/lib/poe-api"

interface LeagueSelectorProps { onLeagueChange?: (league: League) => void; onRealmChange?: (realm: string)=>void }

export function LeagueSelector({ onLeagueChange, onRealmChange }: LeagueSelectorProps) {
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null)
  const [realm, setRealm] = useState<'pc' | 'xbox' | 'sony'>('pc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Restore persisted selection; if none or a Ruthless variant found, prefer Mercenaries as default challenge league
    if (typeof window !== 'undefined') {
      const savedRealm = localStorage.getItem('poe_realm') as any
      let savedLeague = localStorage.getItem('poe_league') || ''
      if (savedRealm && ['pc','xbox','sony'].includes(savedRealm)) setRealm(savedRealm)
      if (!savedLeague || /ruthless/i.test(savedLeague)) {
        savedLeague = 'Mercenaries'
      }
      if (savedLeague) setSelectedLeague({ id: savedLeague, description: undefined, category: undefined })
    }
  }, [])

  useEffect(()=>{
    if (typeof window !== 'undefined') {
      localStorage.setItem('poe_realm', realm)
      if (selectedLeague?.id) localStorage.setItem('poe_league', selectedLeague.id)
    }
  }, [realm, selectedLeague])

  useEffect(() => {
    async function fetchLeagues() {
      try {
        setError(null)
  const leagueData = await poeApi.getLeagues(realm)
  setLeagues(leagueData)
        let chosen: League | undefined = undefined
        if (selectedLeague?.id) {
          chosen = leagueData.find(l=>l.id === selectedLeague.id)
        }
        if (!chosen) {
          // Prefer Mercenaries if present
          chosen = leagueData.find(l=> /^Mercenaries$/i.test(l.id)) || leagueData.find(l=>l.category?.current) || leagueData[0]
        }
        if (chosen) { setSelectedLeague(chosen); onLeagueChange?.(chosen) }
      } catch (error) {
        console.error("Failed to fetch leagues:", error)
  setError("Failed to load leagues from API.")
      } finally {
        setLoading(false)
      }
    }

    fetchLeagues()
  }, [realm, onLeagueChange])

  const handleLeagueChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const leagueId = event.target.value
    const league = leagues.find((l) => l.id === leagueId)
    if (league) {
      setSelectedLeague(league)
      onLeagueChange?.(league)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
          Loading leagues...
        </div>
      </div>
    )
  }

  const currentLeagues = leagues.filter(l=>l.category?.current)
  const previousLeagues = leagues.filter(l=>!l.category?.current)

  return (
    <div className="card">
      {error && (
        <div
          className="mb-4 p-3"
          style={{ background: "rgba(255, 193, 7, 0.1)", border: "1px solid var(--poe-gold)", borderRadius: "6px" }}
        >
          <div className="text-warning text-sm">ℹ️ {error}</div>
        </div>
      )}
      <div className="form-group" style={{display:'flex', gap:'12px'}}>
        <div style={{flex: '0 0 140px'}}>
          <label className="form-label">Realm</label>
          <select className="form-select" value={realm} onChange={e=>{ const r = e.target.value as any; setRealm(r); onRealmChange?.(r) }}>
            <option value="pc">PC</option>
            <option value="xbox">Xbox</option>
            <option value="sony">PlayStation</option>
          </select>
        </div>
        <div style={{flex:1}}>
          <label className="form-label">League</label>
          <select className="form-select" value={selectedLeague?.id || ''} onChange={handleLeagueChange}>
            {currentLeagues.length>0 && <optgroup label="Current leagues">{currentLeagues.map(l=> <option key={l.id} value={l.id}>{l.id}</option>)}</optgroup>}
            {previousLeagues.length>0 && <optgroup label="Previous leagues">{previousLeagues.map(l=> <option key={l.id} value={l.id}>{l.id}</option>)}</optgroup>}
          </select>
        </div>
      </div>

      {selectedLeague && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{selectedLeague.id}</div>
              {selectedLeague.description && (
                <div className="text-sm text-muted mt-1">{selectedLeague.description}</div>
              )}
            </div>
            {selectedLeague.category?.current && <div className="status status-connected">Current</div>}
          </div>
        </div>
      )}
    </div>
  )
}
