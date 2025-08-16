"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'
import { poeApi, type League } from '@/lib/poe-api'

interface LeagueContextValue {
  league: string
  realm: 'pc'|'xbox'|'sony'
  setLeague: (l:string)=>void
  setRealm: (r:'pc'|'xbox'|'sony')=>void
  leagues: League[]
}

const LeagueContext = createContext<LeagueContextValue | undefined>(undefined)

export const LeagueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [league, setLeague] = useState<string>(()=>{
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('poe_league')
      if (stored) return stored
    }
    return 'Mercenaries'
  })
  const [realm, setRealm] = useState<'pc'|'xbox'|'sony'>(()=>{
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('poe_realm') as any
      if (stored && ['pc','xbox','sony'].includes(stored)) return stored
    }
    return 'pc'
  })
  const [leagues, setLeagues] = useState<League[]>([])

  useEffect(()=>{ try { localStorage.setItem('poe_league', league) } catch{} }, [league])
  useEffect(()=>{ try { localStorage.setItem('poe_realm', realm) } catch{} }, [realm])

  useEffect(()=>{
    let mounted = true
    poeApi.getLeagues(realm).then(ls=>{ if(!mounted) return; setLeagues(ls);
      // Migration: if stored league is a Ruthless variant auto-swap to base challenge league
      if (/ruthless/i.test(league)) {
        const merc = ls.find(l=> /^Mercenaries$/i.test(l.id))
        if (merc) { setLeague(merc.id); return }
      }
      if (!ls.find(l=> l.id===league)) {
        const merc = ls.find(l=> /^Mercenaries$/i.test(l.id))
        if (merc) setLeague(merc.id)
        else {
          const cur = ls.find(l=> l.category?.current)
          if (cur) setLeague(cur.id)
        }
      }
    }).catch(()=>{})
    return ()=>{ mounted=false }
  }, [realm])

  return (
    <LeagueContext.Provider value={{ league, realm, setLeague, setRealm, leagues }}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeague() {
  const ctx = useContext(LeagueContext)
  if (!ctx) throw new Error('useLeague must be used within LeagueProvider')
  return ctx
}
