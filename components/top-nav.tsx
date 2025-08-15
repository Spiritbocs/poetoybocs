"use client"

import { useState, useEffect } from 'react'
import { poeApi, type League } from '@/lib/poe-api'

interface TopNavProps {
  realm: 'pc'|'xbox'|'sony'
  league: string
  onRealmChange: (r: 'pc'|'xbox'|'sony') => void
  onLeagueChange: (l: string) => void
}

export function TopNav({ realm, league, onRealmChange, onLeagueChange }: TopNavProps) {
  const [isAuth, setIsAuth] = useState(false)
  const [accountName, setAccountName] = useState<string | null>(null)
  const [leagues, setLeagues] = useState<League[]>([])
  const [loadingLeagues, setLoadingLeagues] = useState(false)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const envReady = (process.env.NEXT_PUBLIC_POE_CLIENT_ID?.length || 0) > 0 && (process.env.NEXT_PUBLIC_POE_REDIRECT_URI?.length || 0) > 0

  // Auth init
  useEffect(()=>{
    const has = poeApi.loadStoredToken()
    setIsAuth(has)
    async function load() {
      if (has) {
        const cached = poeApi.getCachedProfile()
        if (cached?.name) setAccountName(cached.name)
        const prof = await poeApi.getProfile(false)
        if (prof?.name) setAccountName(prof.name)
      }
      setLoadingAuth(false)
    }
    load()
  }, [])

  // League list
  useEffect(()=>{
    let cancelled = false
    async function loadLeagues() {
      try {
        setLoadingLeagues(true)
        const data = await poeApi.getLeagues(realm)
        if (cancelled) return
        setLeagues(data)
        if (!league) {
          const current = data.find(l=>l.category?.current) || data[0]
          if (current) onLeagueChange(current.id)
        }
      } finally {
        if (!cancelled) setLoadingLeagues(false)
      }
    }
    loadLeagues()
    return ()=>{ cancelled = true }
  }, [realm])

  const handleLogin = async () => {
    try {
      const url = await poeApi.getAuthUrl()
      window.location.href = url
    } catch (e) {
      console.error('Auth url error', e)
    }
  }
  const handleLogout = () => {
    poeApi.logout()
    setIsAuth(false)
    setAccountName(null)
  }

  return (
    <nav style={{position:'sticky',top:0,zIndex:50,background:'linear-gradient(90deg,#121212,#181818 40%,#1d1a14 95%)',borderBottom:'1px solid #2a2a2a',padding:'8px 16px',display:'flex',alignItems:'center',gap:24,backdropFilter:'blur(6px)'}}>
      {/* Brand */}
      <div style={{fontWeight:700,fontSize:'1rem',letterSpacing:'.5px',display:'flex',alignItems:'center',gap:6}}>
        <span style={{color:'var(--poe-gold, #c8aa6e)'}}>Spiritbocs</span>
        <span style={{opacity:.65}}>Tracker</span>
      </div>
      {/* Center optional future nav links */}
      <div style={{flex:1}} />
      {/* Realm & League selectors */}
      <div style={{display:'flex',alignItems:'center',gap:12}}>
  <select aria-label="Realm" value={realm} onChange={e=>onRealmChange(e.target.value as any)} style={selectStyle}>
          <option value="pc">PC</option>
          <option value="xbox">Xbox</option>
          <option value="sony">PlayStation</option>
        </select>
  <select aria-label="League" value={league} onChange={e=>onLeagueChange(e.target.value)} style={selectStyle} disabled={loadingLeagues || leagues.length===0}>
          {loadingLeagues && <option>Loading...</option>}
          {!loadingLeagues && leagues.map(l=> <option key={l.id} value={l.id}>{l.id}{l.category?.current ? ' *':''}</option>)}
        </select>
      </div>
      {/* Auth Section */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginLeft:24}}>
        {loadingAuth ? (
          <span style={{fontSize:12,opacity:.7}}>Checking auth...</span>
        ) : !isAuth ? (
          <button onClick={handleLogin} disabled={!envReady} style={btnStylePrimary}>Connect</button>
        ) : (
          <>
            <span style={{fontSize:12,background:'linear-gradient(90deg,#2d2214,#3b2c17)',padding:'4px 10px',borderRadius:20,border:'1px solid #5a4224',color:'#eac07c',boxShadow:'0 0 0 1px rgba(0,0,0,.4), inset 0 0 4px rgba(255,255,255,0.05)'}}>{accountName || 'Account'}</span>
            <button onClick={handleLogout} style={btnStyle}>Disconnect</button>
          </>
        )}
        <a href="https://discord.com/users/625796542456004639" target="_blank" rel="noopener noreferrer" style={btnStyle}>Support</a>
      </div>
    </nav>
  )
}

const selectStyle: React.CSSProperties = {
  background:'linear-gradient(#2a2a2a,#202020)',
  color:'#e4e4e4',
  border:'1px solid #3d3d3d',
  padding:'5px 8px',
  borderRadius:6,
  fontSize:12,
  boxShadow:'0 1px 2px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,0.04)',
  appearance:'none'
}
const btnStyle: React.CSSProperties = {
  background:'linear-gradient(#2b2b2b,#1f1f1f)',
  color:'#d8d8d8',
  border:'1px solid #3b3b3b',
  padding:'5px 12px',
  borderRadius:18,
  fontSize:12,
  cursor:'pointer',
  boxShadow:'0 1px 2px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.04)',
  transition:'background .15s, color .15s, transform .15s'
}
const btnStylePrimary: React.CSSProperties = {
  ...btnStyle,
  background:'linear-gradient(90deg,#7d531f,#b47a2d)',
  border:'1px solid #b58235',
  color:'#ffe7b8'
}
